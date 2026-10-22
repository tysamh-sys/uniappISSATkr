import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as notificationCtrl from '../controllers/notificationController.js';

const router = Router();

router.use(authenticate);

router.get('/', notificationCtrl.getUserNotificationsHandler);
router.post('/read-all', notificationCtrl.markAllNotificationsAsReadHandler);
router.post('/:id/read', notificationCtrl.markNotificationAsReadHandler);
router.patch('/:id/read', notificationCtrl.markNotificationAsReadHandler);

export default router;
