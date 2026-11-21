// Application API. All services communicate exclusively via HTTP with the backend API.
// No mock data, no direct database connection: the frontend only talks to the REST API.

import type {
  Absence,
  AbsenceRow,
  AbsenceStatus,
  Activity,
  AuthSession,
  Certificate,
  CertificateStatus,
  Paged,
  Session,
  SessionRow,
  Student,
  Subject,
  Teacher,
  User,
  UserStatus,
} from "../types";

import { client, getToken, setToken, invalidateQueries, ApiError } from "./client";

export { ApiError };

export const MONTH_LABELS = [
  "Sep", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août"
];

export function generateTemporaryPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 6; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "A1!" + pwd;
}

// ---------------------------------------------------------------------------------------------
// Authentication & Session
// ---------------------------------------------------------------------------------------------

export async function bootstrap(): Promise<AuthSession | null> {
  const token = getToken();
  if (!token) return null;
  try {
    return await client.get<AuthSession>("/auth/me");
  } catch {
    setToken(null);
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await client.post<AuthSession & { token?: string }>("/auth/login", { email, password });
  if (session.token) {
    setToken(session.token);
  }
  invalidateQueries();
  return session;
}

export async function logout(): Promise<void> {
  try {
    await client.post("/auth/logout");
  } catch {
    // Ignore server error on logout
  }
  setToken(null);
  invalidateQueries();
}

export async function changePassword(currentPassword: string, nextPassword: string): Promise<AuthSession> {
  const session = await client.post<AuthSession>("/auth/change-password", { currentPassword, nextPassword });
  invalidateQueries();
  return session;
}

export async function resetDemoData(): Promise<void> {
  // Production safe: query invalidation
  invalidateQueries();
}

// ---------------------------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------------------------

export async function listSubjects(): Promise<Subject[]> {
  return client.get<Subject[]>("/subjects");
}

export async function createSubject(input: { name: string; code: string }): Promise<Subject> {
  const res = await client.post<Subject>("/subjects", input);
  invalidateQueries();
  return res;
}

export async function updateSubject(id: string, input: { name: string; code: string }): Promise<Subject> {
  const res = await client.put<Subject>(`/subjects/${id}`, input);
  invalidateQueries();
  return res;
}

export async function deleteSubject(id: string): Promise<void> {
  await client.delete(`/subjects/${id}`);
  invalidateQueries();
}

// ---------------------------------------------------------------------------------------------
// Classes & Groups
// ---------------------------------------------------------------------------------------------

export async function listGroups(): Promise<{ filiere: string; niveau: string; groupe: string; count: number }[]> {
  return client.get<{ filiere: string; niveau: string; groupe: string; count: number }[]>("/groups");
}

// ---------------------------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------------------------

export interface StudentFilters {
  query?: string;
  filiere?: string;
  niveau?: string;
  groupe?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentInput {
  firstName: string;
  lastName: string;
  registrationNumber: string;
  email: string;
  filiere: string;
  niveau: string;
  groupe: string;
}

export async function listStudents(filters: StudentFilters = {}): Promise<Paged<Student>> {
  const params = {
    search: filters.query,
    filiere: filters.filiere,
    niveau: filters.niveau,
    groupe: filters.groupe,
    page: filters.page,
    pageSize: filters.pageSize,
  };
  return client.get<Paged<Student>>("/students", params);
}

export async function searchStudents(query: string, limit = 8): Promise<Student[]> {
  return client.get<Student[]>("/students/search", { q: query, limit });
}

export async function getStudent(id: string): Promise<Student> {
  return client.get<Student>(`/students/${id}`);
}

export async function createStudent(input: StudentInput): Promise<{ student: Student; temporaryPassword: string }> {
  const res = await client.post<{ student: Student; temporaryPassword: string }>("/students", input);
  invalidateQueries();
  return res;
}

export async function updateStudent(id: string, input: StudentInput): Promise<Student> {
  const res = await client.put<Student>(`/students/${id}`, input);
  invalidateQueries();
  return res;
}

export async function deleteStudent(id: string): Promise<void> {
  await client.delete(`/students/${id}`);
  invalidateQueries();
}

export async function resetStudentPassword(id: string): Promise<string> {
  const res = await client.post<{ temporaryPassword: string }>(`/students/${id}/reset-password`);
  invalidateQueries();
  return res.temporaryPassword;
}

// ---------------------------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------------------------

export interface TeacherRow {
  teacher: Teacher;
  user: User;
  subjects: Subject[];
}

export interface TeacherFilters {
  query?: string;
  status?: UserStatus | "";
  page?: number;
  pageSize?: number;
}

export interface TeacherInput {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  subjectIds: string[];
}

export async function listTeachers(filters: TeacherFilters = {}): Promise<Paged<TeacherRow>> {
  const params = {
    search: filters.query,
    status: filters.status,
    page: filters.page,
    pageSize: filters.pageSize,
  };
  return client.get<Paged<TeacherRow>>("/teachers", params);
}

export async function getTeacher(id: string): Promise<TeacherRow> {
  return client.get<TeacherRow>(`/teachers/${id}`);
}

export async function createTeacher(input: TeacherInput, temporaryPassword: string): Promise<TeacherRow> {
  const res = await client.post<TeacherRow>("/teachers", { ...input, temporaryPassword });
  invalidateQueries();
  return res;
}

export async function updateTeacher(id: string, input: TeacherInput): Promise<TeacherRow> {
  const res = await client.put<TeacherRow>(`/teachers/${id}`, input);
  invalidateQueries();
  return res;
}

export async function setTeacherStatus(id: string, status: UserStatus): Promise<void> {
  await client.patch(`/teachers/${id}/status`, { status });
  invalidateQueries();
}

export async function resetTeacherPassword(id: string, temporaryPassword: string): Promise<void> {
  await client.post(`/teachers/${id}/reset-password`, { temporaryPassword });
  invalidateQueries();
}

export async function deleteTeacher(id: string): Promise<void> {
  await client.delete(`/teachers/${id}`);
  invalidateQueries();
}

// ---------------------------------------------------------------------------------------------
// Sessions & Roll Call
// ---------------------------------------------------------------------------------------------

export interface SessionFilters {
  teacherId?: string;
  subjectId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface RollCallInput {
  sessionId?: string;
  subjectId: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  filiere: string;
  niveau: string;
  groupe: string;
  absentStudentIds: string[];
}

export async function listSessions(filters: SessionFilters = {}): Promise<Paged<SessionRow>> {
  return client.get<Paged<SessionRow>>("/sessions", filters);
}

export async function getSessionDetail(
  id: string
): Promise<{ row: SessionRow; students: Student[]; absences: Absence[] }> {
  return client.get<{ row: SessionRow; students: Student[]; absences: Absence[] }>(`/sessions/${id}`);
}

export async function saveRollCall(
  input: RollCallInput
): Promise<{ session: Session; added: number; removed: number; kept: Student[] }> {
  const res = await client.post<{ session: Session; added: number; removed: number; kept: Student[] }>(
    "/sessions/roll-call",
    input
  );
  invalidateQueries();
  return res;
}

export async function deleteSession(id: string): Promise<void> {
  await client.delete(`/sessions/${id}`);
  invalidateQueries();
}

// ---------------------------------------------------------------------------------------------
// Absences
// ---------------------------------------------------------------------------------------------

export interface AbsenceFilters {
  query?: string;
  studentId?: string;
  teacherId?: string;
  subjectId?: string;
  filiere?: string;
  status?: AbsenceStatus | "";
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface ManualAbsenceInput {
  studentId: string;
  subjectId: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  note?: string;
}

export async function listAbsences(filters: AbsenceFilters = {}): Promise<Paged<AbsenceRow>> {
  const params = {
    search: filters.query,
    studentId: filters.studentId,
    teacherId: filters.teacherId,
    subjectId: filters.subjectId,
    filiere: filters.filiere,
    status: filters.status,
    from: filters.from,
    to: filters.to,
    page: filters.page,
    pageSize: filters.pageSize,
  };
  return client.get<Paged<AbsenceRow>>("/absences", params);
}

export async function getAbsence(id: string): Promise<AbsenceRow> {
  return client.get<AbsenceRow>(`/absences/${id}`);
}

export async function createAbsence(input: ManualAbsenceInput): Promise<AbsenceRow> {
  const res = await client.post<AbsenceRow>("/absences", input);
  invalidateQueries();
  return res;
}

export async function setAbsenceStatus(id: string, status: AbsenceStatus, note?: string): Promise<AbsenceRow> {
  const res = await client.patch<AbsenceRow>(`/absences/${id}/status`, { status, note });
  invalidateQueries();
  return res;
}

export async function deleteAbsence(id: string): Promise<void> {
  await client.delete(`/absences/${id}`);
  invalidateQueries();
}

// ---------------------------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------------------------

export interface CertificateRow {
  certificate: Certificate;
  student: Student;
  absences: AbsenceRow[];
  uploadedBy?: User;
  reviewedBy?: User;
}

export interface CertificateFilters {
  status?: CertificateStatus | "";
  studentId?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface UploadCertificateInput {
  studentId: string;
  absenceIds: string[];
  file: { name: string; type: string; size: number; dataUrl?: string };
  startDate: string;
  endDate: string;
}

export async function listCertificates(filters: CertificateFilters = {}): Promise<Paged<CertificateRow>> {
  return client.get<Paged<CertificateRow>>("/certificates", filters);
}

export async function getCertificate(id: string): Promise<CertificateRow> {
  return client.get<CertificateRow>(`/certificates/${id}`);
}

export async function uploadCertificate(input: UploadCertificateInput): Promise<CertificateRow> {
  const payload = {
    studentId: input.studentId,
    absenceIds: input.absenceIds,
    fileName: input.file.name,
    fileType: input.file.type,
    fileSize: input.file.size,
    dataUrl: input.file.dataUrl,
    startDate: input.startDate,
    endDate: input.endDate,
  };
  const res = await client.post<CertificateRow>("/certificates", payload);
  invalidateQueries();
  return res;
}

export async function reviewCertificate(
  id: string,
  decision: "accepted" | "rejected",
  note?: string
): Promise<CertificateRow> {
  const res = await client.patch<CertificateRow>(`/certificates/${id}/review`, { decision, note });
  invalidateQueries();
  return res;
}

export async function deleteCertificate(id: string): Promise<void> {
  await client.delete(`/certificates/${id}`);
  invalidateQueries();
}

// ---------------------------------------------------------------------------------------------
// Statistics & Activity
// ---------------------------------------------------------------------------------------------

export interface AdminStats {
  studentCount: number;
  teacherCount: number;
  activeTeacherCount: number;
  pendingCertificates: number;
  absencesThisMonth: number;
  unjustifiedRate: number;
  absencesByMonth: number[];
  recentAbsences: AbsenceRow[];
  recentActivity: Activity[];
  flaggedStudents: { student: Student; subject: Subject; count: number }[];
}

export interface TeacherStats {
  subjects: Subject[];
  sessionCount: number;
  absenceCount: number;
  pendingCount: number;
  recentSessions: SessionRow[];
  flaggedStudents: { student: Student; subject: Subject; count: number }[];
  absencesBySubject: { subject: Subject; count: number }[];
}

export interface StudentStats {
  total: number;
  unjustified: number;
  pending: number;
  justified: number;
  rejected: number;
  bySubject: { subject: Subject; total: number; unjustified: number; flagged: boolean }[];
  recent: AbsenceRow[];
  recentActivity: Activity[];
}

export async function listAcademicYears(): Promise<number[]> {
  return client.get<number[]>("/stats/academic-years");
}

export async function adminStats(academicYear: number): Promise<AdminStats> {
  return client.get<AdminStats>("/stats/admin", { academicYear });
}

export async function teacherStats(teacherId: string): Promise<TeacherStats> {
  return client.get<TeacherStats>(`/stats/teacher/${teacherId}`);
}

export async function studentStats(studentId: string): Promise<StudentStats> {
  return client.get<StudentStats>(`/stats/student/${studentId}`);
}

export async function listActivity(forUserId?: string, limit = 20): Promise<Activity[]> {
  return client.get<Activity[]>("/activity", { forUserId, limit });
}

// ---------------------------------------------------------------------------------------------
// Flexible University Data Import System (Admin Only)
// ---------------------------------------------------------------------------------------------

export type ImportEntityType =
  | "STUDENT"
  | "TEACHER"
  | "CLASS"
  | "SUBJECT"
  | "ROOM"
  | "TIMETABLE";

export interface SheetAnalysis {
  sheetName: string;
  rowCount: number;
  headerRowIndex: number;
  headers: string[];
  sampleRows: Record<string, any>[];
  suggestedEntity: ImportEntityType | null;
  confidence: number;
  suggestedMappings: Record<string, string>;
}

export interface FileAnalysisResponse {
  fileToken?: string;
  fileName: string;
  fileSize: number;
  totalSheets: number;
  sheets: SheetAnalysis[];
}

export interface SheetMappingConfig {
  sheetName: string;
  entityType: ImportEntityType;
  columnMappings: Record<string, string>;
}

export interface EntityPreviewItem {
  line: number;
  status: "VALID" | "WARNING" | "ERROR" | "DUPLICATE";
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
  fieldErrors: { line: number; sheetName: string; message: string; severity: "error" | "warning" }[];
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

export interface ImportExecutionOptions {
  strategy: "SKIP" | "UPDATE";
  generateUserAccounts: boolean;
  defaultPassword?: string;
  timetableVersionName?: string;
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
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  totalProcessed: number;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;
  strategyUsed: "SKIP" | "UPDATE";
  entityReports: EntityImportReport[];
  criticalErrors?: string[];
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  importedAt: string;
  adminId: string;
  adminName: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  entityTypes: ImportEntityType[];
  totalRecords: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  summary: ImportExecutionReport;
}

export async function analyzeImportFile(file: File): Promise<FileAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return client.postFormData<FileAnalysisResponse>("/admin/import/analyze", formData);
}

export async function previewImportData(payload: {
  fileToken?: string;
  sheets: SheetMappingConfig[];
}): Promise<ImportPreviewResponse> {
  return client.post<ImportPreviewResponse>("/admin/import/preview", payload);
}

export async function executeImportData(payload: {
  fileToken?: string;
  sheets: SheetMappingConfig[];
  options?: Partial<ImportExecutionOptions>;
}): Promise<ImportExecutionReport> {
  const report = await client.post<ImportExecutionReport>("/admin/import/execute", payload);
  invalidateQueries();
  return report;
}

export async function listImportHistory(limit = 20): Promise<ImportHistoryItem[]> {
  return client.get<ImportHistoryItem[]>("/admin/import/history", { limit });
}

export async function getImportHistoryDetail(id: string): Promise<ImportExecutionReport> {
  return client.get<ImportExecutionReport>(`/admin/import/history/${id}`);
}

export function getSampleDatasetDownloadUrl(): string {
  return "/api/admin/import/sample-dataset";
}

