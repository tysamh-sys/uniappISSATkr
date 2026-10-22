import { Request, Response, NextFunction } from 'express';
import * as absenceReasonService from '../../services/absenceReasonService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';

export async function getAbsenceReasonsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const reasons = await absenceReasonService.getAbsenceReasons();
    return sendSuccess(res, reasons, 'Absence reasons retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getAbsenceReasonByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const reason = await absenceReasonService.getAbsenceReasonById(req.params.id);
    return sendSuccess(res, reason, 'Absence reason retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Absence reason not found', 404);
  }
}

export async function createAbsenceReasonHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const reason = await absenceReasonService.createAbsenceReason(req.body);
    return sendSuccess(res, reason, 'Absence reason created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create absence reason', 400);
  }
}

export async function updateAbsenceReasonHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const reason = await absenceReasonService.updateAbsenceReason(req.params.id, req.body);
    return sendSuccess(res, reason, 'Absence reason updated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update absence reason', 400);
  }
}

export async function deleteAbsenceReasonHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await absenceReasonService.deleteAbsenceReason(req.params.id);
    return sendSuccess(res, null, 'Absence reason deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete absence reason', 400);
  }
}
