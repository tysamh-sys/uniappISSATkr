import { Request, Response, NextFunction } from 'express';
import * as roomService from '../../services/roomService.js';
import { sendSuccess, sendError } from '../../utils/responseFormatter.js';

export async function getRoomsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const rooms = await roomService.getRooms();
    return sendSuccess(res, rooms, 'Rooms retrieved successfully');
  } catch (error: any) {
    next(error);
  }
}

export async function getRoomByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await roomService.getRoomById(req.params.id);
    return sendSuccess(res, room, 'Room retrieved successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Room not found', 404);
  }
}

export async function createRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await roomService.createRoom(req.body);
    return sendSuccess(res, room, 'Room created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to create room', 400);
  }
}

export async function updateRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await roomService.updateRoom(req.params.id, req.body);
    return sendSuccess(res, room, 'Room updated successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update room', 400);
  }
}

export async function deleteRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await roomService.deleteRoom(req.params.id);
    return sendSuccess(res, null, 'Room deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to delete room', 400);
  }
}
