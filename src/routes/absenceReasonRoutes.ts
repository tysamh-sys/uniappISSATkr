import { Router } from 'express';
import { getAbsenceReasonsHandler, getAbsenceReasonByIdHandler } from '../controllers/admin/absenceReasonController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAbsenceReasonsHandler);
router.get('/:id', getAbsenceReasonByIdHandler);

export default router;
