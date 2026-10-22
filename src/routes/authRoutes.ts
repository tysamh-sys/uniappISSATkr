import { Router } from 'express';
import { loginHandler, logoutHandler, getMeHandler, changePasswordHandler } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateMiddleware.js';
import { loginSchema } from '../validators/authValidators.js';

const router = Router();

router.post('/login', validateRequest(loginSchema), loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticate, getMeHandler);
router.post('/change-password', authenticate, changePasswordHandler);

export default router;
