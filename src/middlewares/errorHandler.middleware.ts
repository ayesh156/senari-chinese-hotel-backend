import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Prisma foreign key constraint violation
  if (err.code === 'P2003' || message.includes('Foreign key constraint')) {
    statusCode = 409;
    message = 'Cannot delete: This record is currently in use by other items.';
  }

  console.error(`[Error] ${statusCode} - ${message}`);
  if (statusCode === 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
