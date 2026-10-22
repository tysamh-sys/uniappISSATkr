import { Request, Response, NextFunction } from 'express';
import * as subjectService from '../../services/subjectService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';

export async function getSubjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const subjects = await subjectService.getSubjects();
    return sendSuccess(res, subjects, 'Subjects retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getSubjectByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    return sendSuccess(res, subject, 'Subject retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Subject not found', 404);
  }
}

export async function createSubjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const subject = await subjectService.createSubject(req.body);
    return sendSuccess(res, subject, 'Subject created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create subject', 400);
  }
}

export async function updateSubjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const subject = await subjectService.updateSubject(req.params.id, req.body);
    return sendSuccess(res, subject, 'Subject updated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update subject', 400);
  }
}

export async function deleteSubjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await subjectService.deleteSubject(req.params.id);
    return sendSuccess(res, null, 'Subject deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete subject', 400);
  }
}
