import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[Error]', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const key = Object.keys(err.keyPattern || {})[0] || 'record';
    res.status(409).json({
      success: false,
      message: `A duplicate entry already exists for ${key}.`,
      details: err.keyValue,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.',
  });
}
