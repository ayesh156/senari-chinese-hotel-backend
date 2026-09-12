import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.ts';

// ── Configuration ──────────────────────────────────────────────────────────────
const JWT_SECRET: string = process.env.JWT_SECRET || 'senari-hotel-secret-key-change-in-production';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'senari-hotel-refresh-secret-change-in-production';
const BCRYPT_ROUNDS: number = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
// POS Cashier Shift එකක් අතරතුර token expire වීම වැළැක්වීමට default එක 12h දක්වා වැඩි කිරීම
const ACCESS_TOKEN_EXPIRY: string = process.env.ACCESS_TOKEN_EXPIRY || '12h';
const REFRESH_TOKEN_EXPIRY: string = process.env.REFRESH_TOKEN_EXPIRY || '30d';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TokenPayload {
  userId: number;
  email: string | null;
  role: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface UserResponse {
  id: number;
  name: string;
  email: string | null;
  role: string;
}

interface LoginResult {
  tokens: AuthTokens;
  user: UserResponse;
}

// ── Token Helpers ──────────────────────────────────────────────────────────────
function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY as any,
  });
}

function generateRefreshToken(payload: { userId: number }): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY as any,
  });
}

function parseTokenPayload(payload: jwt.JwtPayload): TokenPayload {
  return {
    userId: Number(payload.userId),
    email: payload.email as string | null,
    role: payload.role as string,
  };
}

// ── Cookie Options ─────────────────────────────────────────────────────────────
const COOKIE_NAME: string = process.env.COOKIE_NAME || 'refreshToken';

function getCookieOptions(): Record<string, unknown> {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge,
  };
}

// ── Service Class ──────────────────────────────────────────────────────────────
export class AuthService {
  /**
   * Authenticate a user with email and password.
   * Returns access + refresh tokens and user data.
   */
  static async login(data: LoginInput): Promise<LoginResult> {
    if (!data.email?.trim() || !data.password?.trim()) {
      throw Object.assign(new Error('Email and password are required'), { statusCode: 400 });
    }

    const email = data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    if (!user.active) {
      throw Object.assign(new Error('Account is deactivated. Contact administrator.'), { statusCode: 401 });
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    return {
      tokens: { accessToken, refreshToken },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   * Implements token rotation for security.
   */
  static async refreshToken(token: string): Promise<LoginResult> {
    if (!token) {
      throw Object.assign(new Error('Refresh token is required'), { statusCode: 401 });
    }

    let decoded: { userId: number };
    try {
      decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: number };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw Object.assign(new Error('Refresh token has expired. Please login again.'), { statusCode: 401, code: 'REFRESH_TOKEN_EXPIRED' });
      }
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, active: true },
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 401 });
    }

    if (!user.active) {
      throw Object.assign(new Error('Account is deactivated'), { statusCode: 401 });
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    return {
      tokens: { accessToken, refreshToken: newRefreshToken },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Fetch current user data by ID.
   */
  static async getUserById(userId: number): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    return user;
  }

  /**
   * Cookie name used for refresh token.
   */
  static get COOKIE_NAME(): string {
    return COOKIE_NAME;
  }

  /**
   * Cookie options for refresh token.
   */
  static getCookieOptions(): Record<string, unknown> {
    return getCookieOptions();
  }
}