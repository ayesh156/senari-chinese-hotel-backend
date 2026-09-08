import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.ts';
import { AuthService } from '../services/auth.service.ts';
import { AuditService, AuditActions, AuditEntities } from '../services/audit.service.ts';
import type { AuthRequest } from '../middlewares/auth.middleware.ts';

function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress;
}
/**
 * POST /api/auth/login
 * Authenticate user with email/password, return tokens + user data.
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const ip = getClientIp(req);

    try {
      const result = await AuthService.login({ email, password: req.body.password });

      // Log successful login non-blocking
      AuditService.login(
        result.user.id,
        result.user.name,
        result.user.role,
        ip,
        true
      );

      // Set refresh token as httpOnly cookie
      res.cookie(
        AuthService.COOKIE_NAME,
        result.tokens.refreshToken,
        AuthService.getCookieOptions() as any
      );

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.tokens.accessToken,
          refreshToken: result.tokens.refreshToken,
        },
      });
    } catch (loginError: any) {
      // Log failed login attempt non-blocking
      if (email) {
        const failedUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        AuditService.login(
          failedUser?.id ?? 0,
          failedUser?.name ?? email,
          failedUser?.role ?? 'UNKNOWN',
          ip,
          false
        );
      }
      throw loginError; // Re-throw to be handled by catch below
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 * Register a new user. Creates user with hashed password.
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'Name, email and password are required' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      res.status(400).json({ success: false, error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || 'STAFF',
        active: true,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    // Log user creation (non-blocking)
    AuditService.created(
      AuditEntities.USER,
      user.id,
      { name: user.name, email: user.email, role: user.role },
      { ipAddress: getClientIp(req) }
    );

    res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Refresh an expired access token using refresh token from cookie or body.
 */
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken: string =
      req.cookies?.[AuthService.COOKIE_NAME] || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        code: 'NO_REFRESH_TOKEN',
        error: 'No refresh token provided',
      });
      return;
    }

    const result = await AuthService.refreshToken(refreshToken);

    // Rotate the refresh token cookie
    res.cookie(
      AuthService.COOKIE_NAME,
      result.tokens.refreshToken,
      AuthService.getCookieOptions() as any
    );

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 */
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await AuthService.getUserById(authReq.user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Clear the refresh token cookie.
 */
export const logout = (_req: Request, res: Response) => {
  res.clearCookie(AuthService.COOKIE_NAME, {
    path: '/api/auth',
  } as any);
  res.json({ success: true, message: 'Logged out successfully' });
};