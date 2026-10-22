import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as sessionCtrl from '../controllers/sessionController.js';

const router = Router();

router.use(authenticate);

router.get('/', sessionCtrl.getSessionsHandler);
router.get('/:id', sessionCtrl.getSessionDetailHandler);
router.post('/roll-call', sessionCtrl.saveRollCallHandler);
router.delete('/:id', sessionCtrl.deleteSessionHandler);

export default router;
