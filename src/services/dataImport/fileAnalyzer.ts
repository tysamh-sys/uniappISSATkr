import xlsx from 'xlsx';
import { ENTITY_DEFINITIONS } from './fieldDefinitions.js';
import { FileAnalysisResponse, ImportEntityType, SheetAnalysis } from './types.js';

/**
 * Normalizes text for fuzzy match comparison:
 * "Prénom Étudiant" -> "prenometudiant"
 * "class_id" -> "classid"
 */
export function normalizeToken(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, ''); // keep only alphanumeric
}

/**
 * Determines whether a cell value looks non-empty and non-metadata
 */
function isMeaningfulCell(val: any): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  return s.length > 0;
}

/**
 * Finds the most likely header row index (0-based) in a 2D sheet array.
 * Looks for the row with the largest number of text-like distinct column names in first 10 rows.
 */
function detectHeaderRow(rows: any[][]): number {
  if (!rows || rows.length === 0) return 0;
  const maxScan = Math.min(12, rows.length);
  let bestRowIndex = 0;
  let maxScore = -1;

  for (let i = 0; i < maxScan; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const nonEmptyCells = row.filter(isMeaningfulCell);
    if (nonEmptyCells.length < 2) continue;

    // Check if cells look like headers (mostly strings, reasonably short)
    let stringCount = 0;
    const uniqueTokens = new Set<string>();

    for (const cell of nonEmptyCells) {
      const s = String(cell).trim();
      if (typeof cell === 'string' && s.length <= 60) {
        stringCount++;
        uniqueTokens.add(normalizeToken(s));
      }
    }

    const distinctRatio = uniqueTokens.size / Math.max(1, nonEmptyCells.length);
    const score = nonEmptyCells.length * 2 + stringCount * 1.5 + distinctRatio * 5;

    if (score > maxScore) {
      maxScore = score;
      bestRowIndex = i;
    }
  }

  return bestRowIndex;
}

/**
 * Computes how well a sheet's headers match a given entity definition.
 * Returns { score, mappings }
 */
function matchEntityForHeaders(
  headers: string[],
  sheetName: string,
  entityType: ImportEntityType
): { score: number; mappings: Record<string, string> } {
  const entityDef = ENTITY_DEFINITIONS[entityType];
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    norm: normalizeToken(h),
  }));

  const normSheetName = normalizeToken(sheetName);
  let nameBonus = 0;

  // Bonus for sheet name matching
  if (entityType === 'STUDENT' && (normSheetName.includes('student') || normSheetName.includes('etudiant') || normSheetName.includes('eleve'))) {
    nameBonus += 25;
  } else if (entityType === 'TEACHER' && (normSheetName.includes('teacher') || normSheetName.includes('enseignant') || normSheetName.includes('prof'))) {
    nameBonus += 25;
  } else if (entityType === 'CLASS' && (normSheetName.includes('class') || normSheetName.includes('classe') || normSheetName.includes('groupe') || normSheetName.includes('filiere') || normSheetName.includes('section'))) {
    nameBonus += 25;
  } else if (entityType === 'SUBJECT' && (normSheetName.includes('subject') || normSheetName.includes('course') || normSheetName.includes('cours') || normSheetName.includes('matiere') || normSheetName.includes('module'))) {
    nameBonus += 25;
  } else if (entityType === 'ROOM' && (normSheetName.includes('room') || normSheetName.includes('salle') || normSheetName.includes('local') || normSheetName.includes('amphi'))) {
    nameBonus += 25;
  } else if (entityType === 'TIMETABLE' && (normSheetName.includes('timetable') || normSheetName.includes('emploi') || normSheetName.includes('schedule') || normSheetName.includes('edt') || normSheetName.includes('planning') || normSheetName.includes('seance'))) {
    nameBonus += 25;
  }

  const mappings: Record<string, string> = {};
  let matchedRequired = 0;
  let totalRequired = 0;
  let points = 0;

  for (const field of entityDef.fields) {
    if (field.required) totalRequired++;

    const normAliases = field.aliases.map(normalizeToken);
    normAliases.push(normalizeToken(field.key));

    let bestHeader: string | null = null;
    let bestDist = Infinity;

    // Check exact matches first following alias priority
    for (const alias of normAliases) {
      if (!alias) continue;
      for (const h of normalizedHeaders) {
        if (h.norm === alias) {
          bestHeader = h.original;
          bestDist = 0;
          break;
        }
      }
      if (bestDist === 0) break;
    }

    // If no exact match found, search substring contains
    if (!bestHeader) {
      for (const alias of normAliases) {
        if (!alias || alias.length < 3) continue;
        // Skip overly generic tokens that cause false substring matches (e.g. "classes_count" -> "class")
        if (['id', 'nom', 'code', 'jour', 'day', 'prof'].includes(alias)) continue;
        for (const h of normalizedHeaders) {
          if (!h.norm) continue;
          // Avoid matching metadata/counter headers
          if (h.norm.includes('count') || h.norm.includes('index') || h.norm.includes('total')) continue;
          if (h.norm.includes(alias) || alias.includes(h.norm)) {
            const diff = Math.abs(h.norm.length - alias.length);
            if (diff < bestDist) {
              bestDist = diff;
              bestHeader = h.original;
            }
          }
        }
      }
    }

    if (bestHeader) {
      mappings[field.key] = bestHeader;
      if (field.required) {
        matchedRequired++;
        points += 15;
      } else {
        points += 8;
      }
    }
  }

  // Calculate final score
  const requiredRatio = totalRequired > 0 ? matchedRequired / totalRequired : 1;
  const finalScore = points * requiredRatio + nameBonus;

  return {
    score: finalScore,
    mappings,
  };
}

/**
 * Analyzes an uploaded Excel/CSV file buffer and extracts sheets, columns, and entity recommendations.
 */
export function analyzeUploadBuffer(
  fileBuffer: Buffer,
  fileName: string
): FileAnalysisResponse {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Le fichier téléchargé ne contient aucune feuille de calcul.');
  }

  const sheetAnalyses: SheetAnalysis[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert sheet to array of rows (2D array)
    const rawMatrix: any[][] = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (!rawMatrix || rawMatrix.length === 0) {
      sheetAnalyses.push({
        sheetName,
        rowCount: 0,
        headerRowIndex: 0,
        headers: [],
        sampleRows: [],
        suggestedEntity: null,
        confidence: 0,
        suggestedMappings: {},
      });
      continue;
    }

    const headerIndex = detectHeaderRow(rawMatrix);
    const headerRow = rawMatrix[headerIndex] || [];

    // Clean and ensure unique headers
    const headers: string[] = [];
    const usedCounts: Record<string, number> = {};

    for (let c = 0; c < headerRow.length; c++) {
      let rawHeader = String(headerRow[c] || '').trim();
      if (!rawHeader) {
        rawHeader = `Colonne_${c + 1}`;
      }
      if (usedCounts[rawHeader] !== undefined) {
        usedCounts[rawHeader]++;
        headers.push(`${rawHeader}_${usedCounts[rawHeader]}`);
      } else {
        usedCounts[rawHeader] = 1;
        headers.push(rawHeader);
      }
    }

    // Extract sample rows
    const dataRows = rawMatrix.slice(headerIndex + 1);
    const sampleRows: Record<string, any>[] = [];
    const sampleCount = Math.min(5, dataRows.length);

    for (let i = 0; i < sampleCount; i++) {
      const rowArr = dataRows[i];
      if (!rowArr || rowArr.length === 0) continue;
      const rowObj: Record<string, any> = {};

      for (let c = 0; c < headers.length; c++) {
        const val = rowArr[c];
        rowObj[headers[c]] = val !== undefined && val !== null ? String(val).trim() : '';
      }
      sampleRows.push(rowObj);
    }

    // Test against all candidate entity types
    const candidateEntities: ImportEntityType[] = [
      'STUDENT',
      'TEACHER',
      'CLASS',
      'SUBJECT',
      'ROOM',
      'TIMETABLE',
    ];

    let bestEntity: ImportEntityType | null = null;
    let maxMatchScore = -1;
    let bestMappings: Record<string, string> = {};

    for (const entity of candidateEntities) {
      const match = matchEntityForHeaders(headers, sheetName, entity);
      if (match.score > maxMatchScore) {
        maxMatchScore = match.score;
        bestEntity = entity;
        bestMappings = match.mappings;
      }
    }

    // If score is too low or ambiguous, don't force a recommendation
    const confidence = maxMatchScore > 20 ? Math.min(0.99, maxMatchScore / 80) : 0;
    if (confidence < 0.25) {
      bestEntity = null;
      bestMappings = {};
    }

    sheetAnalyses.push({
      sheetName,
      rowCount: dataRows.length,
      headerRowIndex: headerIndex,
      headers,
      sampleRows,
      suggestedEntity: bestEntity,
      confidence: Math.round(confidence * 100) / 100,
      suggestedMappings: bestMappings,
    });
  }

  return {
    fileName,
    fileSize: fileBuffer.length,
    totalSheets: sheetAnalyses.length,
    sheets: sheetAnalyses,
  };
}
