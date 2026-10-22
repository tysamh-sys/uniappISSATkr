import { Request, Response, NextFunction } from 'express';
import * as absenceService from '../services/absenceService.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export async function getAbsencesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      studentId: req.query.studentId as string | undefined,
      teacherId: req.query.teacherId as string | undefined,
      subjectId: req.query.subjectId as string | undefined,
      classId: req.query.classId as string | undefined,
      status: req.query.status as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };
    const absences = await absenceService.listAbsences(filters);
    return sendSuccess(res, absences, 'Absences retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getAbsenceByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const absence = await absenceService.getAbsenceById(req.params.id);
    return sendSuccess(res, absence, 'Absence retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Absence not found', 404);
  }
}

export async function createAbsenceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const absence = await absenceService.createManualAbsence(req.body);
    return sendSuccess(res, absence, 'Absence created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create absence', 400);
  }
}

export async function setAbsenceStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, note } = req.body;
    const absence = await absenceService.setAbsenceStatus(req.params.id, status, note);
    return sendSuccess(res, absence, 'Absence status updated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update absence status', 400);
  }
}

export async function deleteAbsenceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await absenceService.deleteAbsence(req.params.id);
    return sendSuccess(res, null, 'Absence deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete absence', 400);
  }
}
