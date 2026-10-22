import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-default-key-change-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing in production!');
}
