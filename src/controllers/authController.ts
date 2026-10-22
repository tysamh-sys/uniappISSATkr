import { Request, Response, NextFunction } from 'express';
import { loginUser, getUserProfile, changeUserPassword } from '../services/authService.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    return sendSuccess(res, result, 'Login successful');
  } catch (error: any) {
    return sendError(res, error.message || 'Invalid credentials', 401);
  }
}

export async function logoutHandler(req: Request, res: Response) {
  return sendSuccess(res, null, 'Logout successful');
}

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthenticated', 401);
    }
    const profile = await getUserProfile(req.user.id);
    return sendSuccess(res, profile, 'User profile retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to fetch user profile', 400);
  }
}

export async function changePasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthenticated', 401);
    }
    const { currentPassword, nextPassword } = req.body;
    const profile = await changeUserPassword(req.user.id, currentPassword, nextPassword);
    return sendSuccess(res, profile, 'Password changed successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to change password', 400);
  }
}
