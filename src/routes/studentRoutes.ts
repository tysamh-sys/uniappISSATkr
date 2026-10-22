import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as studentCtrl from '../controllers/admin/studentController.js';

const router = Router();

router.use(authenticate);

router.get('/search', studentCtrl.searchStudentsHandler);
router.get('/', studentCtrl.getStudentsHandler);
router.get('/:id', studentCtrl.getStudentByIdHandler);
router.post('/', studentCtrl.createStudentHandler);
router.put('/:id', studentCtrl.updateStudentHandler);
router.delete('/:id', studentCtrl.deleteStudentHandler);
router.post('/:id/reset-password', studentCtrl.resetStudentPasswordHandler);

export default router;
