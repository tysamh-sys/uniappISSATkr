import prisma from '../config/database.js';

export async function getRooms() {
  return prisma.room.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getRoomById(id: string) {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) {
    throw new Error('Room not found');
  }
  return room;
}

export async function createRoom(data: { name: string; building?: string | null; capacity?: number | null }) {
  const existing = await prisma.room.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new Error(`Room with name ${data.name} already exists`);
  }

  return prisma.room.create({ data });
}

export async function updateRoom(
  id: string,
  data: Partial<{ name: string; building: string | null; capacity: number | null }>
) {
  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Room not found');
  }

  return prisma.room.update({
    where: { id },
    data,
  });
}

export async function deleteRoom(id: string) {
  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Room not found');
  }

  return prisma.room.delete({ where: { id } });
}
