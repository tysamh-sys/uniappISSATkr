import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as absenceCtrl from '../controllers/absenceController.js';

const router = Router();

router.use(authenticate);

router.get('/', absenceCtrl.getAbsencesHandler);
router.get('/:id', absenceCtrl.getAbsenceByIdHandler);
router.post('/', absenceCtrl.createAbsenceHandler);
router.patch('/:id/status', absenceCtrl.setAbsenceStatusHandler);
router.delete('/:id', absenceCtrl.deleteAbsenceHandler);

export default router;
