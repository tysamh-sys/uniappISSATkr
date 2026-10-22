import { Request, Response, NextFunction } from 'express';
import * as statsService from '../services/statsService.js';
import * as activityService from '../services/activityService.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export async function getAcademicYearsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const years = await statsService.listAcademicYears();
    return sendSuccess(res, years, 'Academic years retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getAdminStatsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const year = req.query.academicYear ? parseInt(req.query.academicYear as string, 10) : undefined;
    const stats = await statsService.getAdminStats(year);
    return sendSuccess(res, stats, 'Admin stats retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getTeacherStatsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.params.id || req.user?.teacherId;
    if (!teacherId) return sendError(res, 'Teacher ID required', 400);

    const stats = await statsService.getTeacherStats(teacherId);
    return sendSuccess(res, stats, 'Teacher stats retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Teacher stats failed', 400);
  }
}

export async function getStudentStatsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.params.id || req.user?.studentId;
    if (!studentId) return sendError(res, 'Student ID required', 400);

    const stats = await statsService.getStudentStats(studentId);
    return sendSuccess(res, stats, 'Student stats retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Student stats failed', 400);
  }
}

export async function getActivityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const forUserId = req.query.forUserId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const activities = await activityService.getActivities(forUserId, limit);
    return sendSuccess(res, activities, 'Activities retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}
