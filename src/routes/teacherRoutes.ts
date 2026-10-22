import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/rbacMiddleware.js';
import { validateRequest } from '../middlewares/validateMiddleware.js';
import { getWeeklyScheduleHandler, getTodayScheduleHandler } from '../controllers/teacher/scheduleController.js';
import { getSessionRosterHandler, initializeSessionHandler, submitAttendanceHandler } from '../controllers/teacher/attendanceController.js';
import { recordAttendanceSchema, initializeSessionSchema } from '../validators/attendanceValidators.js';
import * as teacherMobileCtrl from '../controllers/teacherMobileController.js';

const router = Router();

// Enforce Teacher Authentication & Role
router.use(authenticate, authorize(Role.TEACHER));

// --- Teacher Dashboard ---
router.get('/dashboard', teacherMobileCtrl.getTeacherDashboardHandler);
router.get('/home', teacherMobileCtrl.getTeacherDashboardHandler);

// --- Teacher Schedule ---
router.get('/schedule', getWeeklyScheduleHandler);
router.get('/schedule/today', getTodayScheduleHandler);

// --- Teacher Attendance Management ---
router.get('/sessions/:sessionId', getSessionRosterHandler);
router.get('/roster/:sessionId', teacherMobileCtrl.getSessionRosterMobileHandler);
router.post('/sessions/initialize', validateRequest(initializeSessionSchema), initializeSessionHandler);
router.post('/sessions/:sessionId/attendance', validateRequest(recordAttendanceSchema), submitAttendanceHandler);
router.put('/sessions/:sessionId/attendance', validateRequest(recordAttendanceSchema), submitAttendanceHandler);
router.post('/rollcall/:sessionId', teacherMobileCtrl.submitRollCallHandler);

// --- Teacher Announcements ---
router.post('/announcements', teacherMobileCtrl.createAnnouncementHandler);

// --- Teacher Administrative Requests ---
router.get('/requests', teacherMobileCtrl.getAdministrativeRequestsHandler);
router.post('/requests', teacherMobileCtrl.submitAdministrativeRequestHandler);

export default router;
