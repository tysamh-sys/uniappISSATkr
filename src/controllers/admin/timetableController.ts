import { Request, Response, NextFunction } from 'express';
import * as timetableService from '../../services/timetableService.js';
import * as timetableImportService from '../../services/timetableImportService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';
import { DayOfWeek } from '@prisma/client';

export async function getTimetableVersionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const versions = await timetableService.getTimetableVersions();
    return sendSuccess(res, versions, 'Timetable versions retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function createTimetableVersionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const version = await timetableService.createTimetableVersion(req.body);
    return sendSuccess(res, version, 'Timetable version created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create timetable version', 400);
  }
}

export async function activateTimetableVersionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const version = await timetableService.activateTimetableVersion(req.params.id);
    return sendSuccess(res, version, 'Timetable version activated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to activate timetable version', 400);
  }
}

export async function getTimetableEntriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = {
      timetableVersionId: req.query.timetableVersionId as string,
      teacherId: req.query.teacherId as string,
      classId: req.query.classId as string,
      dayOfWeek: req.query.dayOfWeek as DayOfWeek,
      roomId: req.query.roomId as string,
    };
    const entries = await timetableService.getTimetableEntries(filters);
    return sendSuccess(res, entries, 'Timetable entries retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function createTimetableEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const entry = await timetableService.createTimetableEntry(req.body);
    return sendSuccess(res, entry, 'Timetable entry created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Validation or Conflict Error', 400);
  }
}

export async function updateTimetableEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const entry = await timetableService.updateTimetableEntry(req.params.id, req.body);
    return sendSuccess(res, entry, 'Timetable entry updated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Validation or Conflict Error', 400);
  }
}

export async function deleteTimetableEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await timetableService.deleteTimetableEntry(req.params.id);
    return sendSuccess(res, null, 'Timetable entry deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete timetable entry', 400);
  }
}

// --- Excel/CSV Timetable Import Handlers ---

export async function importPreviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return sendError(res, 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file', 400);
    }
    const timetableVersionId = req.body.timetableVersionId;
    if (!timetableVersionId) {
      return sendError(res, 'timetableVersionId is required in form-data', 400);
    }

    const previewResult = await timetableImportService.processTimetableImportFile(
      req.file.buffer,
      timetableVersionId
    );

    return sendSuccess(res, previewResult, 'Timetable import file validated and preview generated');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to process import file', 400);
  }
}

export async function importConfirmHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { timetableVersionId, entries } = req.body;
    if (!timetableVersionId || !entries || !Array.isArray(entries)) {
      return sendError(res, 'timetableVersionId and entries array are required', 400);
    }

    const createdEntries = await timetableImportService.confirmTimetableImport(timetableVersionId, entries);
    return sendSuccess(res, { count: createdEntries.length, entries: createdEntries }, 'Timetable imported successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to confirm timetable import', 400);
  }
}
