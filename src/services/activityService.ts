import prisma from '../config/database.js';

export async function logActivity(kind: string, message: string, actorUserId: string, subjectUserIds: string[] = []) {
  try {
    return await prisma.activity.create({
      data: {
        kind,
        message,
        actorUserId,
        subjectUserIds,
      },
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export async function getActivities(forUserId?: string, limit = 20) {
  const where: any = {};
  if (forUserId) {
    where.OR = [
      { actorUserId: forUserId },
      { subjectUserIds: { has: forUserId } },
    ];
  }
  return prisma.activity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
