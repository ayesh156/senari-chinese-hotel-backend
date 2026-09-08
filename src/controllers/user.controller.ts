// 🌟 Native Node.js ESM Type-only import
import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.ts';
import { AuditService, AuditEntities, AuditActions } from '../services/audit.service.ts';
import type { AuthRequest } from '../middlewares/auth.middleware.ts';

function auditCtx(authReq: AuthRequest) {
  return { userId: authReq.user?.userId, userName: authReq.user?.email ?? undefined, userRole: authReq.user?.role ?? undefined };
}

/**
 * GET /api/users
 * Admin/Manager: List all users
 */
export const getAllUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await UserService.getAllUsers();
    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Admin: Get a single user by ID
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid user ID' });
      return;
    }
    const user = await UserService.getUserById(id);
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
 * POST /api/users
 * Admin: Create a new user
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, error: 'Name, email and password are required' });
      return;
    }

    const validRoles = ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'];
    const userRole = role || 'STAFF';
    if (!validRoles.includes(userRole)) {
      res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    const user = await UserService.createUser({
      name,
      email,
      password,
      role: userRole as any,
    });

    // Non-blocking audit
    const authReq = req as AuthRequest;
    AuditService.created(
      AuditEntities.USER,
      user.id,
      { name, email, role: userRole },
      auditCtx(authReq)
    );

    res.status(201).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id
 * Admin: Update user profile (name, email, role)
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid user ID' });
      return;
    }

    const { name, email, role } = req.body;

    if (!name && !email && !role) {
      res.status(400).json({ success: false, error: 'At least one field (name, email, role) must be provided' });
      return;
    }

    const validRoles = ['ADMIN', 'MANAGER', 'CASHIER', 'STAFF'];
    if (role && !validRoles.includes(role)) {
      res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    // Get old user for change detection
    const oldUser = await UserService.getUserById(id);
    const user = await UserService.updateUser(id, { name, email, role: role as any });

    // Non-blocking audit
    const authReq = req as AuthRequest;
    const details: Record<string, unknown> = { userId: id };

    if (role && oldUser && oldUser.role !== role) {
      details.oldRole = oldUser.role;
      details.newRole = role;
      AuditService.log({
        ...auditCtx(authReq),
        action: AuditActions.ROLE_CHANGE,
        entity: AuditEntities.USER,
        entityId: id,
        details,
      });
    } else {
      AuditService.updated(
        AuditEntities.USER,
        id,
        { ...details, updated: ['name', 'email'].filter(k => (req.body as any)[k]) },
        auditCtx(authReq)
      );
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id/password
 * Admin: Force-reset a user's password
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid user ID' });
      return;
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ success: false, error: 'New password must be at least 4 characters' });
      return;
    }

    const result = await UserService.resetPassword(id, newPassword);

    // Non-blocking audit
    const authReq = req as AuthRequest;
    AuditService.log({
      ...auditCtx(authReq),
      action: AuditActions.PASSWORD_RESET,
      entity: AuditEntities.USER,
      entityId: id,
      details: { userId: id },
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/me/profile
 * Self-update: user can change their own name and/or password (requires current password)
 */
export const selfUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, password, currentPassword } = req.body;
    if (!currentPassword) {
      res.status(400).json({ success: false, error: 'Current password is required' });
      return;
    }

    if (!name && !password) {
      res.status(400).json({ success: false, error: 'At least name or password must be provided' });
      return;
    }

    const user = await UserService.selfUpdate(authReq.user.userId, {
      name,
      password,
      currentPassword,
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id/status
 * Admin: Toggle user active/deactivated status
 */
export const toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid user ID' });
      return;
    }

    const user = await UserService.toggleStatus(id);

    // Non-blocking audit
    const authReq = req as AuthRequest;
    AuditService.log({
      ...auditCtx(authReq),
      action: AuditActions.STATUS_CHANGE,
      entity: AuditEntities.USER,
      entityId: id,
      details: { userId: id, active: user.active },
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Admin: Delete a user account
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid user ID' });
      return;
    }

    const authReq = req as AuthRequest;
    const oldUser = await UserService.getUserById(id).catch(() => null);

    const result = await UserService.deleteUser(id);

    // Non-blocking audit
    AuditService.deleted(
      AuditEntities.USER,
      id,
      { name: oldUser?.name, email: oldUser?.email },
      auditCtx(authReq)
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
