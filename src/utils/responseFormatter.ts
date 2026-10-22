import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
  meta?: any;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode: number = 200, meta?: any): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
  };
  return res.status(statusCode).json(response);
}

export function sendError(res: Response, message: string, statusCode: number = 400, errors?: any): Response {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
  };
  return res.status(statusCode).json(response);
}
