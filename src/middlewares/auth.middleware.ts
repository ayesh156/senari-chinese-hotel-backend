import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.ts';

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

/**
 * Role hierarchy for permission inheritance.
 * A role at a given level inherits permissions of all roles below it.
 */
const ROLE_HIERARCHY: Record<string, number> = {
  STAFF: 0,
  CASHIER: 1,
  MANAGER: 2,
  ADMIN: 3,
};

/**
 * Check if a user's role has sufficient permissions.
 * @param userRole - The role of the authenticated user
 * @param requiredRole - The minimum role required
 * @returns true if the user has sufficient permissions
 */
function hasMinRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 99;
  return userLevel >= requiredLevel;
}

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
 * Pass allowed roles as arguments. ADMIN bypasses all checks.
 *
 * Usage: router.get('/admin', authorize('ADMIN'), handler)
 *        router.get('/manager', authorize('ADMIN', 'MANAGER'), handler)
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

    // Check if user's role is in the allowed list
    if (!roles.includes(authReq.user.role)) {
      _res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_PERMISSIONS',
        error: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${authReq.user.role}.`,
      });
      return;
    }

    next();
  };
};

/**
 * Require a minimum role level using the hierarchy.
 * Example: requireMinRole('MANAGER') allows ADMIN and MANAGER but not CASHIER/STAFF.
 */
export const requireMinRole = (minRole: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      _res.status(403).json({
        success: false,
        error: 'Not authorized. No user context.',
      });
      return;
    }

    if (!hasMinRole(authReq.user.role, minRole)) {
      _res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_PERMISSIONS',
        error: `Access denied. Minimum role required: ${minRole}. Your role: ${authReq.user.role}.`,
      });
      return;
    }

    next();
  };
};