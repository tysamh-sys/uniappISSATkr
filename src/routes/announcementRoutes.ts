import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as announcementCtrl from '../controllers/announcementController.js';

const router = Router();

router.use(authenticate);

router.get('/', announcementCtrl.getAnnouncementsHandler);
router.post('/:id/read', announcementCtrl.markAnnouncementAsReadHandler);
router.patch('/:id/read', announcementCtrl.markAnnouncementAsReadHandler);

export default router;
