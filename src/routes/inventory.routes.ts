import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import {
  getInventoryItems,
  getInventoryItemById,
  getInventoryItemHistory,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryItemStock,
  deleteInventoryItem,
} from '../controllers/inventory.controller.ts';

const router = Router();

// GET /api/inventory — all authenticated users can read
router.get('/', authMiddleware, getInventoryItems);
// GET /api/inventory/:id
router.get('/:id', authMiddleware, getInventoryItemById);
// GET /api/inventory/:id/history
router.get('/:id/history', authMiddleware, getInventoryItemHistory);
// POST /api/inventory — ADMIN/MANAGER can create
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER'), createInventoryItem);
// PUT /api/inventory/:id — ADMIN/MANAGER can update
router.put('/:id', authMiddleware, authorize('ADMIN', 'MANAGER'), updateInventoryItem);
// PUT /api/inventory/:id/adjust — ADMIN/MANAGER/CASHIER can adjust stock
router.put('/:id/adjust', authMiddleware, authorize('ADMIN', 'MANAGER', 'CASHIER'), adjustInventoryItemStock);
// DELETE /api/inventory/:id — ADMIN only
router.delete('/:id', authMiddleware, authorize('ADMIN'), deleteInventoryItem);

export default router;