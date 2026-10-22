import { Request, Response, NextFunction } from 'express';
import * as sessionService from '../services/sessionService.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export async function getSessionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      teacherId: (req.query.teacherId as string) || (req.user?.role === 'TEACHER' ? req.user.teacherId : undefined),
      subjectId: req.query.subjectId as string | undefined,
      classId: req.query.classId as string | undefined,
      date: req.query.date as string | undefined,
      filiere: req.query.filiere as string | undefined,
      niveau: req.query.niveau as string | undefined,
      groupe: req.query.groupe as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };
    const result = await sessionService.listSessions(filters);
    return sendSuccess(res, result, 'Sessions retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getSessionDetailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await sessionService.getSessionDetail(req.params.id);
    return sendSuccess(res, result, 'Session details retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Session not found', 404);
  }
}

export async function saveRollCallHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.body.teacherId || req.user?.teacherId;
    if (!teacherId) throw new Error('Identifiant enseignant requis.');

    const result = await sessionService.saveRollCall({
      ...req.body,
      teacherId,
    });
    return sendSuccess(res, result, 'Roll call saved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to save roll call', 400);
  }
}

export async function deleteSessionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await sessionService.deleteSession(req.params.id);
    return sendSuccess(res, null, 'Session deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete session', 400);
  }
}
