import { Request, Response, NextFunction } from 'express';
import * as studentService from '../../services/studentService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';

export async function getStudentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      classId: req.query.classId as string | undefined,
      filiere: req.query.filiere as string | undefined,
      niveau: req.query.niveau as string | undefined,
      groupe: req.query.groupe as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };
    const result = await studentService.getStudents(filters);
    return sendSuccess(res, result, 'Students retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function searchStudentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = (req.query.q || req.query.query || '') as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
    const students = await studentService.searchStudents(query, limit);
    return sendSuccess(res, students, 'Students search results');
  } catch (error: any) {
    next(error);
  }
}

export async function getStudentByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await studentService.getStudentById(req.params.id);
    return sendSuccess(res, student, 'Student retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Student not found', 404);
  }
}

export async function createStudentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await studentService.createStudent(req.body);
    return sendSuccess(res, result, 'Student created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create student', 400);
  }
}

export async function updateStudentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await studentService.updateStudent(req.params.id, req.body);
    return sendSuccess(res, student, 'Student updated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update student', 400);
  }
}

export async function deleteStudentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await studentService.deleteStudent(req.params.id);
    return sendSuccess(res, null, 'Student deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete student', 400);
  }
}

export async function resetStudentPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const tempPass = await studentService.resetStudentPassword(req.params.id);
    return sendSuccess(res, { temporaryPassword: tempPass }, 'Password reset successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to reset password', 400);
  }
}
