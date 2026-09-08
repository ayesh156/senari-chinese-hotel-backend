import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  settlePurchaseOrder,
} from '../controllers/purchaseOrder.controller.ts';

const router = Router();

// POST /api/purchase-orders — ADMIN/MANAGER only (financial commitment)
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER'), createPurchaseOrder);
// GET /api/purchase-orders — all authenticated can view
router.get('/', authMiddleware, getPurchaseOrders);
// GET /api/purchase-orders/:id
router.get('/:id', authMiddleware, getPurchaseOrderById);
// PUT /api/purchase-orders/:id — ADMIN/MANAGER only
router.put('/:id', authMiddleware, authorize('ADMIN', 'MANAGER'), updatePurchaseOrder);
// DELETE /api/purchase-orders/:id — ADMIN only
router.delete('/:id', authMiddleware, authorize('ADMIN'), deletePurchaseOrder);
// POST /api/purchase-orders/:id/settle — ADMIN/MANAGER only
router.post('/:id/settle', authMiddleware, authorize('ADMIN', 'MANAGER'), settlePurchaseOrder);

export default router;