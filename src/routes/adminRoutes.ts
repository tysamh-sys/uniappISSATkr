import { Router } from 'express';
import multer from 'multer';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/rbacMiddleware.js';
import { validateRequest } from '../middlewares/validateMiddleware.js';

import * as studentCtrl from '../controllers/admin/studentController.js';
import * as teacherCtrl from '../controllers/admin/teacherController.js';
import * as classCtrl from '../controllers/admin/classController.js';
import * as subjectCtrl from '../controllers/admin/subjectController.js';
import * as roomCtrl from '../controllers/admin/roomController.js';
import * as absenceReasonCtrl from '../controllers/admin/absenceReasonController.js';
import * as timetableCtrl from '../controllers/admin/timetableController.js';
import * as dashboardCtrl from '../controllers/admin/dashboardController.js';
import * as importCtrl from '../controllers/admin/importController.js';

import { createStudentSchema, updateStudentSchema } from '../validators/studentValidators.js';
import { createTeacherSchema, updateTeacherSchema } from '../validators/teacherValidators.js';
import { createClassSchema, updateClassSchema } from '../validators/classValidators.js';
import { createSubjectSchema, updateSubjectSchema } from '../validators/subjectValidators.js';
import { createRoomSchema, updateRoomSchema } from '../validators/roomValidators.js';
import { createAbsenceReasonSchema, updateAbsenceReasonSchema } from '../validators/absenceReasonValidators.js';
import {
  createTimetableVersionSchema,
  createTimetableEntrySchema,
  updateTimetableEntrySchema,
  confirmTimetableImportSchema,
} from '../validators/timetableValidators.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const name = file.originalname.toLowerCase();
    if (allowed.some((ext) => name.endsWith(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non supporté. Veuillez importer un fichier Excel (.xlsx, .xls) ou CSV.'));
    }
  },
});
const router = Router();

// Enforce Admin Authentication & Role
router.use(authenticate, authorize(Role.ADMIN));

// --- Dashboard & Monitoring ---
router.get('/dashboard', dashboardCtrl.getDashboardHandler);
router.get('/attendance/missing', dashboardCtrl.getMissingAttendanceHandler);
router.get('/attendance/records', dashboardCtrl.getAttendanceHistoryHandler);

// --- Students ---
router.get('/students', studentCtrl.getStudentsHandler);
router.get('/students/:id', studentCtrl.getStudentByIdHandler);
router.post('/students', validateRequest(createStudentSchema), studentCtrl.createStudentHandler);
router.put('/students/:id', validateRequest(updateStudentSchema), studentCtrl.updateStudentHandler);
router.delete('/students/:id', studentCtrl.deleteStudentHandler);

// --- Teachers ---
router.get('/teachers', teacherCtrl.getTeachersHandler);
router.get('/teachers/:id', teacherCtrl.getTeacherByIdHandler);
router.post('/teachers', validateRequest(createTeacherSchema), teacherCtrl.createTeacherHandler);
router.put('/teachers/:id', validateRequest(updateTeacherSchema), teacherCtrl.updateTeacherHandler);
router.delete('/teachers/:id', teacherCtrl.deleteTeacherHandler);

// --- Classes ---
router.get('/classes', classCtrl.getClassesHandler);
router.get('/classes/:id', classCtrl.getClassByIdHandler);
router.post('/classes', validateRequest(createClassSchema), classCtrl.createClassHandler);
router.put('/classes/:id', validateRequest(updateClassSchema), classCtrl.updateClassHandler);
router.delete('/classes/:id', classCtrl.deleteClassHandler);

// --- Subjects ---
router.get('/subjects', subjectCtrl.getSubjectsHandler);
router.get('/subjects/:id', subjectCtrl.getSubjectByIdHandler);
router.post('/subjects', validateRequest(createSubjectSchema), subjectCtrl.createSubjectHandler);
router.put('/subjects/:id', validateRequest(updateSubjectSchema), subjectCtrl.updateSubjectHandler);
router.delete('/subjects/:id', subjectCtrl.deleteSubjectHandler);

// --- Rooms ---
router.get('/rooms', roomCtrl.getRoomsHandler);
router.get('/rooms/:id', roomCtrl.getRoomByIdHandler);
router.post('/rooms', validateRequest(createRoomSchema), roomCtrl.createRoomHandler);
router.put('/rooms/:id', validateRequest(updateRoomSchema), roomCtrl.updateRoomHandler);
router.delete('/rooms/:id', roomCtrl.deleteRoomHandler);

// --- Absence Reasons ---
router.get('/absence-reasons', absenceReasonCtrl.getAbsenceReasonsHandler);
router.get('/absence-reasons/:id', absenceReasonCtrl.getAbsenceReasonByIdHandler);
router.post('/absence-reasons', validateRequest(createAbsenceReasonSchema), absenceReasonCtrl.createAbsenceReasonHandler);
router.put('/absence-reasons/:id', validateRequest(updateAbsenceReasonSchema), absenceReasonCtrl.updateAbsenceReasonHandler);
router.delete('/absence-reasons/:id', absenceReasonCtrl.deleteAbsenceReasonHandler);

// --- Timetable Versions & Entries ---
router.get('/timetable/versions', timetableCtrl.getTimetableVersionsHandler);
router.post('/timetable/versions', validateRequest(createTimetableVersionSchema), timetableCtrl.createTimetableVersionHandler);
router.post('/timetable/versions/:id/activate', timetableCtrl.activateTimetableVersionHandler);

router.get('/timetable/entries', timetableCtrl.getTimetableEntriesHandler);
router.post('/timetable/entries', validateRequest(createTimetableEntrySchema), timetableCtrl.createTimetableEntryHandler);
router.put('/timetable/entries/:id', validateRequest(updateTimetableEntrySchema), timetableCtrl.updateTimetableEntryHandler);
router.delete('/timetable/entries/:id', timetableCtrl.deleteTimetableEntryHandler);

// --- Timetable CSV/Excel Import Pipeline ---
router.post('/timetable/import/preview', upload.single('file'), timetableCtrl.importPreviewHandler);
router.post('/timetable/import/confirm', validateRequest(confirmTimetableImportSchema), timetableCtrl.importConfirmHandler);

// --- Flexible University Data Import System (Admin Only) ---
router.post('/import/analyze', upload.single('file'), importCtrl.analyzeImportFileHandler);
router.post('/import/preview', upload.single('file'), importCtrl.previewImportHandler);
router.post('/import/execute', upload.single('file'), importCtrl.executeImportHandler);
router.get('/import/history', importCtrl.getImportHistoryHandler);
router.get('/import/history/:id', importCtrl.getImportHistoryDetailHandler);
router.get('/import/sample-dataset', importCtrl.downloadSampleDatasetHandler);

export default router;
