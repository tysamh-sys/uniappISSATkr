import { Request, Response, NextFunction } from 'express';
import * as attendanceService from '../../services/attendanceService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';

export async function getSessionRosterHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'User profile is not linked to a Teacher', 403);
    }
    const sessionId = req.params.sessionId;
    const roster = await attendanceService.getSessionClassStudents(sessionId, teacherId);
    return sendSuccess(res, roster, 'Session student roster retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to fetch session roster', 403);
  }
}

export async function initializeSessionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'User profile is not linked to a Teacher', 403);
    }
    const { timetableEntryId, date } = req.body;
    if (!timetableEntryId || !date) {
      return sendError(res, 'timetableEntryId and date are required', 400);
    }

    const session = await attendanceService.initializeOrGetAttendanceSession(timetableEntryId, date, teacherId);
    return sendSuccess(res, session, 'Attendance session initialized', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to initialize session', 400);
  }
}

export async function submitAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'User profile is not linked to a Teacher', 403);
    }
    const sessionId = req.params.sessionId;
    const { records } = req.body;

    const session = await attendanceService.submitAttendanceRecords(sessionId, teacherId, records);
    return sendSuccess(res, session, 'Attendance records saved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to submit attendance', 400);
  }
}
