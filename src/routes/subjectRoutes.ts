import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as subjectCtrl from '../controllers/admin/subjectController.js';

const router = Router();

router.use(authenticate);

router.get('/', subjectCtrl.getSubjectsHandler);
router.get('/:id', subjectCtrl.getSubjectByIdHandler);
router.post('/', subjectCtrl.createSubjectHandler);
router.put('/:id', subjectCtrl.updateSubjectHandler);
router.delete('/:id', subjectCtrl.deleteSubjectHandler);

export default router;
