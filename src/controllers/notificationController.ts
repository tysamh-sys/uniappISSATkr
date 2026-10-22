import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';

export async function getUserNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Utilisateur non authentifié.', 401);
    }

    const data = await notificationService.getUserNotifications(userId);
    return sendSuccess(res, data, 'Notifications récupérées avec succès.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la récupération des notifications.', 400);
  }
}

export async function markNotificationAsReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Utilisateur non authentifié.', 401);
    }

    const { id } = req.params;
    await notificationService.markNotificationAsRead(id, userId);
    return sendSuccess(res, { id, isRead: true }, 'Notification marquée comme lue.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la mise à jour de la notification.', 400);
  }
}

export async function markAllNotificationsAsReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Utilisateur non authentifié.', 401);
    }

    await notificationService.markAllNotificationsAsRead(userId);
    return sendSuccess(res, { success: true }, 'Toutes les notifications ont été marquées comme lues.');
  } catch (error: any) {
    return sendError(res, error.message || 'Erreur lors de la mise à jour des notifications.', 400);
  }
}
