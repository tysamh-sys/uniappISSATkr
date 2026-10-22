import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as teacherCtrl from '../controllers/admin/teacherController.js';

const router = Router();

router.use(authenticate);

router.get('/', teacherCtrl.getTeachersHandler);
router.get('/:id', teacherCtrl.getTeacherByIdHandler);
router.post('/', teacherCtrl.createTeacherHandler);
router.put('/:id', teacherCtrl.updateTeacherHandler);
router.patch('/:id/status', teacherCtrl.setTeacherStatusHandler);
router.post('/:id/reset-password', teacherCtrl.resetTeacherPasswordHandler);
router.delete('/:id', teacherCtrl.deleteTeacherHandler);

export default router;
