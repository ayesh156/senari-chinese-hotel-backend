import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.ts';

const BCRYPT_ROUNDS = 12;

export type RoleInput = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STAFF';

export interface CreateUserInput {
  name: string;
  username?: string;
  email: string;
  password: string;
  role: RoleInput;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: RoleInput;
}

export interface SelfUpdateInput {
  name?: string;
  password?: string;
  currentPassword: string;
}

export class UserService {
  /**
   * Fetch all users (admin/manager only).
   */
  static async getAllUsers() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    return users;
  }

  /**
   * Get a single user by ID.
   */
  static async getUserById(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    return user;
  }

  /**
   * Create a new user with hashed password.
   */
  static async createUser(data: CreateUserInput) {
    // Validate email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        role: (data.role || 'STAFF') as any,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return user;
  }

  /**
   * Update a user's profile (name, email, role). Admin only.
   */
  static async updateUser(id: number, data: UpdateUserInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    // If email is being changed, check uniqueness
    if (data.email && data.email.toLowerCase().trim() !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (existing) {
        throw Object.assign(new Error('Email already registered by another user'), { statusCode: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.email && { email: data.email.toLowerCase().trim() }),
        ...(data.role && { role: data.role as any }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return updated;
  }

  /**
   * Admin force-reset a user's password.
   */
  static async resetPassword(id: number, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Self-update profile: user can change their own name and password (requires current password verification).
   */
  static async selfUpdate(userId: number, data: SelfUpdateInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
    }

    const updateData: any = {};

    if (data.name) {
      updateData.name = data.name.trim();
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    return updated;
  }

  /**
   * Toggle user active/deactivated status. Admin only.
   */
  static async toggleStatus(id: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    // Prevent deactivating the last ADMIN
    if (user.active && user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', active: true } });
      if (adminCount <= 1) {
        throw Object.assign(
          new Error('Cannot deactivate the last active ADMIN account'),
          { statusCode: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { active: !user.active },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    return updated;
  }

  /**
   * Delete a user account. Admin only.
   */
  static async deleteUser(id: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    // Prevent deleting the last ADMIN
    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        throw Object.assign(
          new Error('Cannot delete the last ADMIN account'),
          { statusCode: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }
}