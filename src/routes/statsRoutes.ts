import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as statsCtrl from '../controllers/statsController.js';

const router = Router();

router.use(authenticate);

router.get('/academic-years', statsCtrl.getAcademicYearsHandler);
router.get('/admin', statsCtrl.getAdminStatsHandler);
router.get('/teacher/:id', statsCtrl.getTeacherStatsHandler);
router.get('/student/:id', statsCtrl.getStudentStatsHandler);

export default router;
