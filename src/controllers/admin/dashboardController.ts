import { Request, Response, NextFunction } from 'express';
import { getAdminDashboardStats } from '../../services/dashboardService.js';
import { getMissingAttendanceSessions } from '../../services/missingAttendanceService.js';
import { getAttendanceHistory } from '../../services/attendanceService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';

export async function getDashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await getAdminDashboardStats();
    return sendSuccess(res, stats, 'Admin dashboard stats retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getMissingAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dateParam = req.query.date as string | undefined;
    const date = dateParam ? new Date(dateParam) : undefined;
    const missing = await getMissingAttendanceSessions(date);
    return sendSuccess(res, missing, 'Missing attendance sessions retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getAttendanceHistoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      classId: req.query.classId as string,
      teacherId: req.query.teacherId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };
    const history = await getAttendanceHistory(filters);
    return sendSuccess(res, history, 'Attendance history retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}
