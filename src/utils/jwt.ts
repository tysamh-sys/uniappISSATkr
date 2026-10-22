import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AuthUser } from '../types/express.js';

export function generateToken(user: AuthUser): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    teacherId: user.teacherId,
    studentId: user.studentId,
  };

  const options: SignOptions = {
    expiresIn: ENV.JWT_EXPIRES_IN as unknown as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, ENV.JWT_SECRET as Secret, options);
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, ENV.JWT_SECRET as Secret) as any;
  return {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    teacherId: decoded.teacherId,
    studentId: decoded.studentId,
  };
}
