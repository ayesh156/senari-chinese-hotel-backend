import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import {
  getOrders,
  getLiveOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/order.controller.ts';

const router = Router();

// GET /api/orders — all authenticated can view
router.get('/', authMiddleware, getOrders);
// GET /api/orders/live — active orders
router.get('/live', authMiddleware, getLiveOrders);
// GET /api/orders/:id
router.get('/:id', authMiddleware, getOrderById);
// POST /api/orders — Public: Allows web customers & POS to place pre-orders without token
router.post('/', createOrder);
// PUT /api/orders/:id — ADMIN/MANAGER can update orders
router.put('/:id', authMiddleware, authorize('ADMIN', 'MANAGER'), updateOrder);
// PUT /api/orders/:id/status — staff can update order status
router.put('/:id/status', authMiddleware, updateOrderStatus);
// DELETE /api/orders/:id — ADMIN only
router.delete('/:id', authMiddleware, authorize('ADMIN'), deleteOrder);

export default router;