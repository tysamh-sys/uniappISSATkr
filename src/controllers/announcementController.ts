import { Request, Response, NextFunction } from 'express';
import * as announcementService from '../services/announcementService.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export async function getAnnouncementsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Utilisateur non authentifié.', 401);
    }

    const role = req.user?.role || 'STUDENT';
    const studentId = req.user?.studentId;
    const teacherId = req.user?.teacherId;

    const announcements = await announcementService.getAnnouncementsForUser(userId, role, studentId, teacherId);
    return sendSuccess(res, announcements, 'Annonces récupérées avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la récupération des annonces.', 400);
  }
}

export async function markAnnouncementAsReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.user?.studentId;
    if (!studentId) {
      return sendError(res, 'Action réservée aux étudiants.', 403);
    }

    const { id } = req.params;
    await announcementService.markAnnouncementAsRead(id, studentId);
    return sendSuccess(res, { id, isRead: true }, 'Annonce marquée comme lue.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la mise à jour de l’annonce.', 400);
  }
}
