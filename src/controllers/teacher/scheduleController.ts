import { Request, Response, NextFunction } from 'express';
import { getTeacherWeeklySchedule, getTeacherTodaySchedule } from '../../services/teacherScheduleService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';

export async function getWeeklyScheduleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'User profile is not linked to a Teacher', 403);
    }
    const schedule = await getTeacherWeeklySchedule(teacherId);
    return sendSuccess(res, schedule, 'Weekly schedule retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getTodayScheduleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'User profile is not linked to a Teacher', 403);
    }
    const dateParam = req.query.date as string | undefined;
    const dateInput = dateParam ? new Date(dateParam) : undefined;

    const todaySchedule = await getTeacherTodaySchedule(teacherId, dateInput);
    return sendSuccess(res, todaySchedule, "Today's schedule retrieved successfully");
  } catch (error: any) {
    next(error);
  }
}
