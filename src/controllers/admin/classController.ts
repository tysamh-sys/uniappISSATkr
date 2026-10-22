import { Request, Response, NextFunction } from 'express';
import * as classService from '../../services/classService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';

export async function getClassesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const classes = await classService.getClasses();
    return sendSuccess(res, classes, 'Classes retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getGroupsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const groups = await classService.getGroups();
    return sendSuccess(res, groups, 'Groups retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getClassByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const classItem = await classService.getClassById(req.params.id);
    return sendSuccess(res, classItem, 'Class retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Class not found', 404);
  }
}

export async function createClassHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const classItem = await classService.createClass(req.body);
    return sendSuccess(res, classItem, 'Class created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create class', 400);
  }
}

export async function updateClassHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const classItem = await classService.updateClass(req.params.id, req.body);
    return sendSuccess(res, classItem, 'Class updated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update class', 400);
  }
}

export async function deleteClassHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await classService.deleteClass(req.params.id);
    return sendSuccess(res, null, 'Class deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete class', 400);
  }
}
