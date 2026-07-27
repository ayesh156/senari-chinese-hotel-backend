import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware';
import { getUnits, createUnit, updateUnit, deleteUnit } from '../controllers/unit.controller';

const router = Router();

// GET /api/units — all authenticated users can read
router.get('/', authMiddleware, getUnits);
// POST /api/units — ADMIN/MANAGER can create
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER'), createUnit);
// PUT /api/units/:id — ADMIN/MANAGER can update
router.put('/:id', authMiddleware, authorize('ADMIN', 'MANAGER'), updateUnit);
// DELETE /api/units/:id — ADMIN only
router.delete('/:id', authMiddleware, authorize('ADMIN'), deleteUnit);

export default router;