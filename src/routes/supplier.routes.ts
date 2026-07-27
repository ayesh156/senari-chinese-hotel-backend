import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware';
import { getSuppliers, getSupplierById, getSupplierPayments, getSupplierReminders, createSupplier, updateSupplier, deleteSupplier, settleSupplierPayable, sendSupplierReminder } from '../controllers/supplier.controller';

const router = Router();

// Read — all authenticated
router.get('/', authMiddleware, getSuppliers);
router.get('/:id', authMiddleware, getSupplierById);
router.get('/:id/payments', authMiddleware, getSupplierPayments);
router.get('/:id/reminders', authMiddleware, getSupplierReminders);
// Write — ADMIN/MANAGER
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER'), createSupplier);
router.put('/:id', authMiddleware, authorize('ADMIN', 'MANAGER'), updateSupplier);
router.delete('/:id', authMiddleware, authorize('ADMIN'), deleteSupplier);
router.post('/:id/settle', authMiddleware, authorize('ADMIN', 'MANAGER'), settleSupplierPayable);
router.post('/:id/remind', authMiddleware, authorize('ADMIN', 'MANAGER', 'CASHIER'), sendSupplierReminder);

export default router;