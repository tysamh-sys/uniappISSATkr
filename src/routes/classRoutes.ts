import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as classCtrl from '../controllers/admin/classController.js';

const router = Router();

router.use(authenticate);

router.get('/', classCtrl.getClassesHandler);
router.get('/groups', classCtrl.getGroupsHandler);
router.get('/:id', classCtrl.getClassByIdHandler);
router.post('/', classCtrl.createClassHandler);
router.put('/:id', classCtrl.updateClassHandler);
router.delete('/:id', classCtrl.deleteClassHandler);

export default router;
