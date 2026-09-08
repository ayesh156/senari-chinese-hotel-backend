import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
} from '../controllers/invoice.controller.ts';

const router = Router();

// GET /api/invoices — all authenticated can view invoices
router.get('/', authMiddleware, getInvoices);
// GET /api/invoices/:id
router.get('/:id', authMiddleware, getInvoiceById);
// POST /api/invoices — ADMIN/MANAGER/CASHIER can create invoices
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER', 'CASHIER'), createInvoice);

export default router;