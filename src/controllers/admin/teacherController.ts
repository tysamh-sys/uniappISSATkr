import { Request, Response, NextFunction } from 'express';
import * as teacherService from '../../services/teacherService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';

export async function getTeachersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      subjectId: req.query.subjectId as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };
    const teachers = await teacherService.getTeachers(filters);
    return sendSuccess(res, teachers, 'Teachers retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getTeacherByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacher = await teacherService.getTeacherById(req.params.id);
    return sendSuccess(res, teacher, 'Teacher retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Teacher not found', 404);
  }
}

export async function createTeacherHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const temporaryPassword = req.body.temporaryPassword;
    const teacher = await teacherService.createTeacher(req.body, temporaryPassword);
    return sendSuccess(res, teacher, 'Teacher created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create teacher', 400);
  }
}

export async function updateTeacherHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacher = await teacherService.updateTeacher(req.params.id, req.body);
    return sendSuccess(res, teacher, 'Teacher updated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update teacher', 400);
  }
}

export async function setTeacherStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    await teacherService.setTeacherStatus(req.params.id, status);
    return sendSuccess(res, null, 'Teacher status updated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update teacher status', 400);
  }
}

export async function resetTeacherPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { temporaryPassword } = req.body;
    const tempPass = await teacherService.resetTeacherPassword(req.params.id, temporaryPassword);
    return sendSuccess(res, { temporaryPassword: tempPass }, 'Password reset successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to reset password', 400);
  }
}

export async function deleteTeacherHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await teacherService.deleteTeacher(req.params.id);
    return sendSuccess(res, null, 'Teacher deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete teacher', 400);
  }
}
