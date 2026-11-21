import prisma from '../../config/database.js';
import { ImportHistoryItem, ImportExecutionReport } from './types.js';

export async function getImportHistory(limit = 20): Promise<ImportHistoryItem[]> {
  try {
    const activities = await prisma.activity.findMany({
      where: { kind: 'DATA_IMPORT' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const items: ImportHistoryItem[] = [];

    for (const act of activities) {
      try {
        const report: ImportExecutionReport = JSON.parse(act.message);
        const entityTypes = report.entityReports ? report.entityReports.map((r) => r.entityType) : [];

        items.push({
          id: report.id || act.id,
          fileName: report.fileName || 'fichier_import.xlsx',
          importedAt: report.importedAt || act.createdAt.toISOString(),
          adminId: act.actorUserId,
          adminName: report.adminName || 'Administrateur',
          status: report.status || 'SUCCESS',
          entityTypes,
          totalRecords: report.totalProcessed || 0,
          insertedCount: report.totalInserted || 0,
          updatedCount: report.totalUpdated || 0,
          skippedCount: report.totalSkipped || 0,
          errorCount: report.totalFailed || 0,
          summary: report,
        });
      } catch (err) {
        // Skip malformed records
      }
    }

    return items;
  } catch (err) {
    console.error('Error fetching import history:', err);
    return [];
  }
}

export async function getImportHistoryById(id: string): Promise<ImportExecutionReport | null> {
  try {
    const activities = await prisma.activity.findMany({
      where: { kind: 'DATA_IMPORT' },
      take: 100,
    });

    for (const act of activities) {
      try {
        const report: ImportExecutionReport = JSON.parse(act.message);
        if (report.id === id || act.id === id) {
          return report;
        }
      } catch {}
    }

    return null;
  } catch (err) {
    console.error(`Error fetching import report ${id}:`, err);
    return null;
  }
}
