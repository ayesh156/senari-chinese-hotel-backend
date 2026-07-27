import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import type { AuthRequest } from '../middlewares/auth.middleware';

/**
 * GET /api/audit-logs
 * Returns paginated, filtered audit logs.
 * Restricted to ADMIN only via route middleware.
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page,
      limit,
      from,
      to,
      action,
      entity,
      userId,
      search,
    } = req.query;

    const result = await AuditService.query({
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      action: action as string | undefined,
      entity: entity as string | undefined,
      userId: userId ? parseInt(userId as string, 10) : undefined,
      search: search as string | undefined,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};