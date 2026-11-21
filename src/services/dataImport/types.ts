import { DayOfWeek } from '@prisma/client';

export type ImportEntityType =
  | 'STUDENT'
  | 'TEACHER'
  | 'CLASS'
  | 'SUBJECT'
  | 'ROOM'
  | 'TIMETABLE';

export type FieldDataType =
  | 'string'
  | 'number'
  | 'email'
  | 'enum'
  | 'time'
  | 'timeSlot'
  | 'dayOfWeek';

export interface EntityFieldDefinition {
  key: string;
  labelFr: string;
  labelEn: string;
  required: boolean;
  type: FieldDataType;
  description: string;
  aliases: string[];
}

export interface SheetAnalysis {
  sheetName: string;
  rowCount: number;
  headerRowIndex: number; // 0-based
  headers: string[];
  sampleRows: Record<string, any>[];
  suggestedEntity: ImportEntityType | null;
  confidence: number; // 0 to 1
  suggestedMappings: Record<string, string>; // internalFieldKey -> excelColumnHeader
}

export interface FileAnalysisResponse {
  fileName: string;
  fileSize: number;
  totalSheets: number;
  sheets: SheetAnalysis[];
}

export interface SheetMappingConfig {
  sheetName: string;
  entityType: ImportEntityType;
  columnMappings: Record<string, string>; // internalFieldKey -> excelColumnHeader
}

export interface RowValidationError {
  line: number;
  sheetName: string;
  field?: string;
  value?: any;
  message: string;
  severity: 'error' | 'warning';
}

export interface EntityPreviewItem {
  line: number;
  status: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE';
  raw: Record<string, any>;
  parsed: Record<string, any>;
  errors: string[];
  warnings: string[];
  diff?: {
    existing: Record<string, any>;
    incoming: Record<string, any>;
  };
}

export interface SheetValidationResult {
  sheetName: string;
  entityType: ImportEntityType;
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  missingRequiredCount: number;
  previewRows: EntityPreviewItem[];
  fieldErrors: RowValidationError[];
}

export interface ImportPreviewResponse {
  canProceed: boolean;
  sheets: SheetValidationResult[];
  overallSummary: {
    totalRecords: number;
    validRecords: number;
    warningRecords: number;
    errorRecords: number;
    duplicateRecords: number;
    entitiesDetected: ImportEntityType[];
  };
  dependenciesSummary: {
    classesNeeded: string[];
    classesFound: string[];
    teachersNeeded: string[];
    teachersFound: string[];
    subjectsNeeded: string[];
    subjectsFound: string[];
    roomsNeeded: string[];
    roomsFound: string[];
    unresolvedDependencies: string[];
  };
}

export type DuplicateStrategy = 'SKIP' | 'UPDATE';

export interface ImportExecutionOptions {
  strategy: DuplicateStrategy; // 'SKIP' or 'UPDATE'
  generateUserAccounts: boolean; // default: true for teachers and students
  defaultPassword?: string;
  timetableVersionName?: string;
  atomicTransaction?: boolean; // roll back all if any entity fails
}

export interface ImportExecutionRequest {
  sheets: SheetMappingConfig[];
  options: ImportExecutionOptions;
}

export interface EntityImportReport {
  entityType: ImportEntityType;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface ImportExecutionReport {
  id: string;
  fileName: string;
  importedAt: string;
  adminId: string;
  adminName: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  totalProcessed: number;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;
  strategyUsed: DuplicateStrategy;
  entityReports: EntityImportReport[];
  criticalErrors?: string[];
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  importedAt: string;
  adminId: string;
  adminName: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  entityTypes: ImportEntityType[];
  totalRecords: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  summary: ImportExecutionReport;
}
