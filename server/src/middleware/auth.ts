import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User, IUser } from '../models/User';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required. Missing or malformed token.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; role: string };

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User belonging to this token no longer exists.', 401);
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new AppError('Invalid or expired authentication token.', 401));
    } else {
      next(error);
    }
  }
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string; role: string };
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // If token invalid, proceed unauthenticated
    next();
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    next(new AppError('Access forbidden. Administrator privileges required.', 403));
    return;
  }
  next();
}
