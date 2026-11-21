import { Request, Response } from 'express';
import { analyzeUploadBuffer } from '../../services/dataImport/fileAnalyzer.js';
import { validateImportData } from '../../services/dataImport/dataValidator.js';
import { executeImportWorkflow } from '../../services/dataImport/dataImporter.js';
import { getImportHistory, getImportHistoryById } from '../../services/dataImport/importHistoryService.js';
import { generateTestUniversityWorkbook } from '../../services/dataImport/sampleDatasetService.js';
import { SheetMappingConfig, ImportExecutionOptions } from '../../services/dataImport/types.js';

// Secure in-memory buffer cache for uploaded import files (TTL 30 mins)
interface CachedFile {
  fileName: string;
  buffer: Buffer;
  expiresAt: number;
}
const MAX_CACHE_ENTRIES = 50;
const fileCache = new Map<string, CachedFile>();

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, item] of fileCache.entries()) {
    if (item.expiresAt < now) {
      fileCache.delete(key);
    }
  }
  // Enforce maximum entries cap (evict oldest if exceeding limit)
  if (fileCache.size > MAX_CACHE_ENTRIES) {
    const keysToDelete = Array.from(fileCache.keys()).slice(0, fileCache.size - MAX_CACHE_ENTRIES);
    keysToDelete.forEach((k) => fileCache.delete(k));
  }
}

/**
 * POST /api/admin/import/analyze
 * Uploads an Excel or CSV file and analyzes all sheets, headers, and entity suggestions.
 */
export async function analyzeImportFileHandler(req: Request, res: Response) {
  try {
    cleanExpiredCache();
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni. Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV.',
      });
    }

    const fileName = file.originalname || 'document.xlsx';
    const analysis = analyzeUploadBuffer(file.buffer, fileName);

    // Cache the file buffer for subsequent preview & execute steps
    const fileToken = `tok_${Date.now()}_${Math.random().toString(36).slice(-6)}`;
    fileCache.set(fileToken, {
      fileName,
      buffer: file.buffer,
      expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    });

    return res.status(200).json({
      success: true,
      data: {
        fileToken,
        ...analysis,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de l\'analyse du fichier.',
    });
  }
}

/**
 * POST /api/admin/import/preview
 * Validates the column mappings for the selected sheets and provides a preview before importing.
 */
export async function previewImportHandler(req: Request, res: Response) {
  try {
    cleanExpiredCache();
    const { fileToken, sheets } = req.body as {
      fileToken?: string;
      sheets: SheetMappingConfig[];
    };

    let buffer: Buffer | null = null;
    if (fileToken && fileCache.has(fileToken)) {
      buffer = fileCache.get(fileToken)!.buffer;
    } else if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
    }

    if (!buffer) {
      return res.status(400).json({
        success: false,
        message: 'Fichier introuvable ou session expirée. Veuillez recharger votre fichier.',
      });
    }

    if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune configuration de feuille fournie pour la validation.',
      });
    }

    const preview = await validateImportData(buffer, sheets);

    return res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la validation des données.',
    });
  }
}

/**
 * POST /api/admin/import/execute
 * Executes the database transaction and imports records according to the administrator\'s mapping and options.
 */
export async function executeImportHandler(req: Request, res: Response) {
  try {
    cleanExpiredCache();
    const { fileToken, sheets, options } = req.body as {
      fileToken?: string;
      sheets: SheetMappingConfig[];
      options?: Partial<ImportExecutionOptions>;
    };

    let buffer: Buffer | null = null;
    let fileName = 'fichier_import.xlsx';

    if (fileToken && fileCache.has(fileToken)) {
      const cached = fileCache.get(fileToken)!;
      buffer = cached.buffer;
      fileName = cached.fileName;
    } else if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
      fileName = req.file.originalname || fileName;
    }

    if (!buffer) {
      return res.status(400).json({
        success: false,
        message: 'Fichier d\'importation introuvable. Veuillez recharger votre fichier.',
      });
    }

    if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune feuille sélectionnée pour l\'importation.',
      });
    }

    const defaultOptions: ImportExecutionOptions = {
      strategy: options?.strategy || 'SKIP',
      generateUserAccounts: options?.generateUserAccounts !== false,
      defaultPassword: options?.defaultPassword || 'issatk2026',
      timetableVersionName: options?.timetableVersionName || 'Semestre en cours (Importé)',
    };

    const adminUser = {
      id: req.user?.id || 'admin-system',
      name: req.user?.email ? req.user.email.split('@')[0] : 'Administrateur',
      email: req.user?.email || 'admin@issatk.rnu.tn',
    };

    const report = await executeImportWorkflow(
      buffer,
      fileName,
      sheets,
      defaultOptions,
      adminUser
    );

    return res.status(200).json({
      success: true,
      message:
        report.status === 'SUCCESS'
          ? 'Importation terminée avec succès.'
          : report.status === 'PARTIAL'
          ? 'Importation terminée avec certains éléments ignorés ou échoués.'
          : 'L\'importation a échoué.',
      data: report,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Une erreur est survenue pendant l\'importation des données.',
    });
  }
}

/**
 * GET /api/admin/import/history
 * Returns the audit trail of past imports.
 */
export async function getImportHistoryHandler(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const history = await getImportHistory(limit);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Impossible de récupérer l\'historique des imports.',
    });
  }
}

/**
 * GET /api/admin/import/history/:id
 * Returns details of a specific import run.
 */
export async function getImportHistoryDetailHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const report = await getImportHistoryById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapport d\'importation introuvable.',
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la récupération du rapport.',
    });
  }
}

/**
 * GET /api/admin/import/sample-dataset
 * Generates and downloads the test university Excel workbook.
 */
export async function downloadSampleDatasetHandler(req: Request, res: Response) {
  try {
    const buffer = generateTestUniversityWorkbook();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="EDT-groupes-dataset-test.xlsx"'
    );
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors de la génération du dataset de test.',
    });
  }
}
