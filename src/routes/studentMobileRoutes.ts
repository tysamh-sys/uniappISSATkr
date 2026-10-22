import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorize } from '../middlewares/rbacMiddleware.js';
import * as studentMobileCtrl from '../controllers/studentMobileController.js';

const router = Router();

// Enforce Student Authentication & Role
router.use(authenticate, authorize(Role.STUDENT));

router.get('/dashboard', studentMobileCtrl.getStudentDashboardHandler);
router.get('/home', studentMobileCtrl.getStudentDashboardHandler);
router.get('/timetable', studentMobileCtrl.getStudentTimetableHandler);
router.get('/schedule', studentMobileCtrl.getStudentTimetableHandler);
router.get('/attendance', studentMobileCtrl.getStudentAttendanceHandler);
router.post('/justify', studentMobileCtrl.submitStudentJustificationHandler);
router.post('/certificates', studentMobileCtrl.submitStudentJustificationHandler);
router.get('/courses/:id', studentMobileCtrl.getCourseDetailsHandler);
router.get('/classes/:id', studentMobileCtrl.getCourseDetailsHandler);

export default router;
