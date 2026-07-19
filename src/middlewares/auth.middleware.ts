import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

// ── Type Extensions ────────────────────────────────────────────────────────────
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string | null;
    role: string;
  };
}

// ── Configuration ──────────────────────────────────────────────────────────────
const JWT_SECRET: string = process.env.JWT_SECRET || 'senari-hotel-secret-key-change-in-production';

// ── Middleware: Protect Routes ──────────────────────────────────────────────────
/**
 * Verifies the Bearer token from the Authorization header.
 * Attaches decoded user payload to req.user.
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Extract token from Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      _res.status(401).json({
        success: false,
        code: 'NO_TOKEN',
        error: 'Access denied. No token provided.',
      });
      return;
    }

    // Verify the access token
    let decoded: { userId: number; email: string; role: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as typeof decoded;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        _res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          error: 'Access token has expired. Please refresh.',
        });
        return;
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        _res.status(401).json({
          success: false,
          code: 'INVALID_TOKEN',
          error: 'Invalid access token.',
        });
        return;
      }
      throw jwtError;
    }

    // Verify the user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    if (!user) {
      _res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        error: 'User not found.',
      });
      return;
    }

    if (!user.active) {
      _res.status(401).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        error: 'Account is deactivated.',
      });
      return;
    }

    // Attach user to request
    (req as AuthRequest).user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    _res.status(500).json({
      success: false,
      error: 'Internal server error during authentication.',
    });
  }
};

// ── Middleware: Role-Based Authorization ────────────────────────────────────────
/**
 * Restrict access based on user roles.
 * Pass allowed roles as arguments. SUPER_ADMIN bypasses all checks.
 *
 * Usage: router.get('/admin', authorize('ADMIN'), handler)
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      _res.status(403).json({
        success: false,
        error: 'Not authorized. No user context.',
      });
      return;
    }

    // ADMIN bypasses all role checks
    if (authReq.user.role === 'ADMIN') {
      next();
      return;
    }

    if (!roles.includes(authReq.user.role)) {
      _res.status(403).json({
        success: false,
        error: 'Not authorized. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};