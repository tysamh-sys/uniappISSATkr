import { Router } from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import teacherRoutes from './teacherRoutes.js';
import teacherAdminRoutes from './teacherAdminRoutes.js';
import absenceReasonRoutes from './absenceReasonRoutes.js';
import studentRoutes from './studentRoutes.js';
import studentMobileRoutes from './studentMobileRoutes.js';
import subjectRoutes from './subjectRoutes.js';
import classRoutes from './classRoutes.js';
import groupRoutes from './groupRoutes.js';
import sessionRoutes from './sessionRoutes.js';
import absenceRoutes from './absenceRoutes.js';
import certificateRoutes from './certificateRoutes.js';
import statsRoutes from './statsRoutes.js';
import activityRoutes from './activityRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import announcementRoutes from './announcementRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/teacher', teacherRoutes);
router.use('/student', studentMobileRoutes);
router.use('/notifications', notificationRoutes);
router.use('/announcements', announcementRoutes);
router.use('/absence-reasons', absenceReasonRoutes);

router.use('/students', studentRoutes);
router.use('/teachers', teacherAdminRoutes);
router.use('/subjects', subjectRoutes);
router.use('/classes', classRoutes);
router.use('/groups', groupRoutes);
router.use('/sessions', sessionRoutes);
router.use('/absences', absenceRoutes);
router.use('/certificates', certificateRoutes);
router.use('/stats', statsRoutes);
router.use('/activity', activityRoutes);

export default router;
