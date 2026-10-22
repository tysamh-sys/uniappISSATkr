import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as statsCtrl from '../controllers/statsController.js';

const router = Router();

router.use(authenticate);

router.get('/', statsCtrl.getActivityHandler);

export default router;
