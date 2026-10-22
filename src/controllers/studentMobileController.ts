import { Request, Response, NextFunction } from 'express';
import * as studentMobileService from '../services/studentMobileService.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export async function getStudentDashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      return sendError(res, 'Utilisateur non associé à un profil étudiant.', 403);
    }

    const dateParam = req.query.date as string | undefined;
    const dashboard = await studentMobileService.getStudentDashboard(studentId, dateParam);
    return sendSuccess(res, dashboard, 'Tableau de bord étudiant récupéré avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la récupération du tableau de bord.', 400);
  }
}

export async function getStudentTimetableHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      return sendError(res, 'Utilisateur non associé à un profil étudiant.', 403);
    }

    const dayParam = (req.query.day || req.query.date) as string | undefined;
    const timetable = await studentMobileService.getStudentTimetable(studentId, dayParam);
    return sendSuccess(res, timetable, 'Emploi du temps récupéré avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la récupération de l’emploi du temps.', 400);
  }
}

export async function getStudentAttendanceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      return sendError(res, 'Utilisateur non associé à un profil étudiant.', 403);
    }

    const filter = req.query.filter as string | undefined;
    const data = await studentMobileService.getStudentAttendanceSummaryAndRecords(studentId, filter);
    return sendSuccess(res, data, 'Historique des présences récupéré avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la récupération des présences.', 400);
  }
}

export async function submitStudentJustificationHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      return sendError(res, 'Utilisateur non associé à un profil étudiant.', 403);
    }

    const receipt = await studentMobileService.submitStudentJustification(studentId, req.body);
    return sendSuccess(res, receipt, 'Justificatif transmis avec succès.', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Échec de la transmission du justificatif.', 400);
  }
}

export async function getCourseDetailsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      return sendError(res, 'Utilisateur non associé à un profil étudiant.', 403);
    }

    const courseId = req.params.id;
    const details = await studentMobileService.getCourseDetailsForStudent(studentId, courseId);
    return sendSuccess(res, details, 'Détails du cours récupérés avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la récupération des détails du cours.', 400);
  }
}
