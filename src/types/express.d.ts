import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  teacherId?: string;
  studentId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
