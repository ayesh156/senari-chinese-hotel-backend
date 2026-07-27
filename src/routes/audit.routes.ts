import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware';
import { getAuditLogs } from '../controllers/audit.controller';

const router = Router();

// All audit routes require authentication + ADMIN role
router.use(authMiddleware);
router.use(authorize('ADMIN'));

// GET /api/audit-logs — Paginated, filtered audit log listing
router.get('/', getAuditLogs);

export default router;