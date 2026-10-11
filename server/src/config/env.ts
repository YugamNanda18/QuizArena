import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quizarena_enterprise',
  JWT_SECRET: process.env.JWT_SECRET || 'quizarena_enterprise_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@quizarena.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@123456',
};
