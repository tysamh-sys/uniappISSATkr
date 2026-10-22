import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as classCtrl from '../controllers/admin/classController.js';

const router = Router();

router.use(authenticate);

router.get('/', classCtrl.getGroupsHandler);

export default router;
