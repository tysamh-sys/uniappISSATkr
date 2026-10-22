import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import * as certCtrl from '../controllers/certificateController.js';

const router = Router();

router.use(authenticate);

router.get('/', certCtrl.getCertificatesHandler);
router.get('/:id', certCtrl.getCertificateByIdHandler);
router.post('/', certCtrl.uploadCertificateHandler);
router.patch('/:id/review', certCtrl.reviewCertificateHandler);
router.delete('/:id', certCtrl.deleteCertificateHandler);

export default router;
