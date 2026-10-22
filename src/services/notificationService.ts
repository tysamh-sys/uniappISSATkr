import prisma from '../config/database.js';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'À l’instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;

  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export async function getUserNotifications(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    text: n.message,
    time: formatRelativeTime(n.createdAt),
    unread: !n.isRead,
    icon: n.icon || 'bell',
    type: n.type,
    createdAt: n.createdAt.toISOString(),
  }));

  const unreadCount = formatted.filter((n) => n.unread).length;

  return {
    unreadCount,
    totalCount: formatted.length,
    notifications: formatted,
  };
}

export async function markNotificationAsRead(id: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    throw new Error('Notification introuvable.');
  }

  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
