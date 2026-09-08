import prisma from '../lib/prisma.ts';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface AuditLogInput {
  userId?: number | null;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  action?: string;
  entity?: string;
  userId?: number;
  search?: string;
}

export interface PaginatedAuditLogs {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Audit Actions ──────────────────────────────────────────────────────────────
export const AuditActions = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PRICE_CHANGE: 'PRICE_CHANGE',
  INVENTORY_ADJUSTMENT: 'INVENTORY_ADJUSTMENT',
  STATUS_CHANGE: 'STATUS_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  ROLE_CHANGE: 'ROLE_CHANGE',
} as const;

// ── Audit Entities ─────────────────────────────────────────────────────────────
export const AuditEntities = {
  ORDER: 'Order',
  FOOD_ITEM: 'FoodItem',
  CATEGORY: 'Category',
  UNIT: 'Unit',
  INVENTORY: 'Inventory',
  USER: 'User',
  CUSTOMER: 'Customer',
  SUPPLIER: 'Supplier',
  PURCHASE_ORDER: 'PurchaseOrder',
  INVOICE: 'Invoice',
  SETTINGS: 'Settings',
  TABLE: 'Table',
  AUTH: 'Auth',
} as const;

// ── Helper ─────────────────────────────────────────────────────────────────────
function normalizeEntityId(entityId?: string | number | null): string | undefined {
  if (entityId === null || entityId === undefined) return undefined;
  return String(entityId);
}

/**
 * Check if the auditLog delegate is available on the Prisma client.
 * Returns false if the delegate is undefined (client not regenerated).
 */
function hasAuditLogDelegate(): boolean {
  return typeof (prisma as any).auditLog !== 'undefined';
}

// ── Service ────────────────────────────────────────────────────────────────────
export class AuditService {
  /**
   * Log an audit event. This is designed to be non-blocking — failures are
   * caught silently so they never interrupt the main transaction flow.
   */
  static async log(input: AuditLogInput): Promise<void> {
    // Graceful fallback: if prisma.auditLog is undefined, skip silently
    if (!hasAuditLogDelegate()) {
      console.warn('[AuditLog] prisma.auditLog delegate is not available — skipping log entry');
      return;
    }
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId ?? undefined,
          userName: input.userName ?? '',
          userRole: input.userRole ?? '',
          action: input.action,
          entity: input.entity,
          entityId: normalizeEntityId(input.entityId),
          details: (input.details as any) ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
        },
      });
    } catch (error) {
      // Non-blocking: silently log to console on failure
      console.error('[AuditLog] Failed to record audit entry:', error);
    }
  }

  /**
   * Convenience: log a CREATE event.
   */
  static async created(
    entity: string,
    entityId: string | number,
    details: Record<string, unknown> | null,
    context?: { userId?: number | null; userName?: string; userRole?: string; ipAddress?: string }
  ): Promise<void> {
    await AuditService.log({
      ...context,
      action: AuditActions.CREATE,
      entity,
      entityId,
      details,
    });
  }

  /**
   * Convenience: log an UPDATE event.
   * Typically `details` should contain { old, new } or a description.
   */
  static async updated(
    entity: string,
    entityId: string | number | null,
    details: Record<string, unknown> | null,
    context?: { userId?: number | null; userName?: string; userRole?: string; ipAddress?: string }
  ): Promise<void> {
    await AuditService.log({
      ...context,
      action: AuditActions.UPDATE,
      entity,
      entityId,
      details,
    });
  }

  /**
   * Convenience: log a DELETE event.
   */
  static async deleted(
    entity: string,
    entityId: string | number | null,
    details: Record<string, unknown> | null,
    context?: { userId?: number | null; userName?: string; userRole?: string; ipAddress?: string }
  ): Promise<void> {
    await AuditService.log({
      ...context,
      action: AuditActions.DELETE,
      entity,
      entityId,
      details,
    });
  }

  /**
   * Convenience: log a LOGIN event.
   */
  static async login(
    userId: number,
    userName: string,
    userRole: string,
    ipAddress?: string,
    success: boolean = true
  ): Promise<void> {
    await AuditService.log({
      userId,
      userName,
      userRole,
      action: success ? AuditActions.LOGIN : AuditActions.LOGIN_FAILED,
      entity: AuditEntities.AUTH,
      entityId: String(userId),
      details: { success },
      ipAddress,
    });
  }

  // ── Query (Admin only) ─────────────────────────────────────────────────────

  /**
   * Query audit logs with pagination and filtering.
   * Restricted to ADMIN role via the route middleware.
   * Gracefully returns empty result if the auditLog delegate is unavailable.
   */
  static async query(params: AuditLogQuery): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));

    // Graceful fallback: if prisma.auditLog is undefined, return empty page
    if (!hasAuditLogDelegate()) {
      console.warn('[AuditLog] prisma.auditLog delegate is not available — returning empty result');
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Date range filter
    if (params.from || params.to) {
      const createdAt: Record<string, Date> = {};
      if (params.from) createdAt.gte = new Date(params.from);
      if (params.to) createdAt.lte = new Date(params.to);
      where.createdAt = createdAt;
    }

    // Action filter
    if (params.action) {
      where.action = params.action;
    }

    // Entity filter
    if (params.entity) {
      where.entity = params.entity;
    }

    // User filter
    if (params.userId) {
      where.userId = params.userId;
    }

    // Search term (userName or details text)
    if (params.search) {
      where.OR = [
        { userName: { contains: params.search } },
        { details: { contains: params.search } },
        { entityId: { contains: params.search } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: where as any }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}