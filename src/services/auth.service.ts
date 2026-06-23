import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  token: string;
  user: {
    id: number;
    name: string;
    email: string | null;
    role: string;
  };
}

export class AuthService {
  static async login(data: LoginInput): Promise<LoginResult> {
    if (!data.email || !data.password) {
      throw Object.assign(new Error('Email and password are required'), { statusCode: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !user.active) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const jwtSecret: string = process.env.JWT_SECRET || 'fallback-secret';
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}