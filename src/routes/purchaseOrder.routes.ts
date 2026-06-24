import { Router } from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  settlePurchaseOrder,
} from '../controllers/purchaseOrder.controller';

const router = Router();

// POST /api/purchase-orders       — Create a new PO with auto-generated PO#, stock increment
router.post('/', createPurchaseOrder);

// GET /api/purchase-orders         — List all POs
router.get('/', getPurchaseOrders);

// GET /api/purchase-orders/:id     — Get single PO with items + payments
router.get('/:id', getPurchaseOrderById);

// PUT /api/purchase-orders/:id     — Update PO (revert old stock, apply new stock)
router.put('/:id', updatePurchaseOrder);

// DELETE /api/purchase-orders/:id  — Delete PO, reverse stock, remove payments
router.delete('/:id', deletePurchaseOrder);

// POST /api/purchase-orders/:id/settle — Make a payment against a PO
router.post('/:id/settle', settlePurchaseOrder);

export default router;