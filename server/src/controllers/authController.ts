import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config/env';
import { loginSchema } from '../validators/schemas';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

function generateToken(id: string, role: string): string {
  return jwt.sign({ id, role }, config.JWT_SECRET, { expiresIn: '7d' });
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = loginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() });

    if (!user) {
      throw new AppError('Invalid credentials. User not found.', 401);
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials. Password incorrect.', 401);
    }

    const token = generateToken(user._id.toString(), user.role);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Unauthorized', 401);
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        studentId: req.user.studentId,
      },
    });
  } catch (error) {
    next(error);
  }
}
