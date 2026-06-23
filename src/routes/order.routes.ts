import { Router } from 'express';
import {
  getOrders,
  getLiveOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/order.controller';

const router = Router();

// GET /api/orders — fetch all orders with items
router.get('/', getOrders);
// GET /api/orders/live — active orders (not COMPLETED)
router.get('/live', getLiveOrders);
// GET /api/orders/:id — single order
router.get('/:id', getOrderById);
// POST /api/orders — create order (dynamic payment status)
router.post('/', createOrder);
// PUT /api/orders/:id — update order (edit flow)
router.put('/:id', updateOrder);
// PUT /api/orders/:id/status — update order status with Socket.io
router.put('/:id/status', updateOrderStatus);
// DELETE /api/orders/:id — safe cascade
router.delete('/:id', deleteOrder);

export default router;