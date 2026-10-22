import { Request, Response, NextFunction } from 'express';
import * as teacherMobileService from '../services/teacherMobileService.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export async function getTeacherDashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'Utilisateur non associé à un profil enseignant.', 403);
    }

    const dateParam = req.query.date as string | undefined;
    const dashboard = await teacherMobileService.getTeacherDashboard(teacherId, dateParam);
    return sendSuccess(res, dashboard, 'Tableau de bord enseignant récupéré avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la récupération du tableau de bord.', 400);
  }
}

export async function getSessionRosterMobileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'Utilisateur non associé à un profil enseignant.', 403);
    }

    const sessionId = req.params.sessionId;
    const roster = await teacherMobileService.getTeacherSessionRoster(sessionId, teacherId);
    return sendSuccess(res, roster, 'Liste d’appel récupérée avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la récupération de la liste d’appel.', 400);
  }
}

export async function submitRollCallHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'Utilisateur non associé à un profil enseignant.', 403);
    }

    const sessionId = req.params.sessionId;
    const { records } = req.body;

    if (!Array.isArray(records)) {
      return sendError(res, 'Format invalide: un tableau records est attendu.', 400);
    }

    const result = await teacherMobileService.submitTeacherRollCall(sessionId, teacherId, records);
    return sendSuccess(res, result, 'Feuille de présence confirmée et enregistrée avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Échec de l’enregistrement de la feuille de présence.', 400);
  }
}

export async function createAnnouncementHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'Utilisateur non associé à un profil enseignant.', 403);
    }

    const { classId, className, subjectId, title, message } = req.body;
    if (!title || !message) {
      return sendError(res, 'Le titre et le message de l’annonce sont requis.', 400);
    }

    const announcement = await teacherMobileService.createTeacherAnnouncement(teacherId, {
      classId,
      className,
      subjectId,
      title,
      message,
    });

    return sendSuccess(res, announcement, 'Annonce publiée et étudiants notifiés avec succès.', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de l’envoi de l’annonce.', 400);
  }
}

export async function submitAdministrativeRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'Utilisateur non associé à un profil enseignant.', 403);
    }

    const { type, date, reason } = req.body;
    if (!type || !reason) {
      return sendError(res, 'Le type de demande et le motif sont requis.', 400);
    }

    const targetDate = date ? new Date(date) : new Date();
    const result = await teacherMobileService.submitAdministrativeRequest(teacherId, {
      type,
      date: targetDate,
      reason,
    });

    return sendSuccess(res, result, 'Demande administrative enregistrée avec succès.', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la soumission de la demande.', 400);
  }
}

export async function getAdministrativeRequestsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user?.teacherId;
    if (!teacherId) {
      return sendError(res, 'Utilisateur non associé à un profil enseignant.', 403);
    }

    const list = await teacherMobileService.getTeacherAdministrativeRequests(teacherId);
    return sendSuccess(res, list, 'Demandes administratives récupérées avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la récupération des demandes.', 400);
  }
}
