import { Router } from 'express';
import { getSuppliers, getSupplierById, getSupplierPayments, getSupplierReminders, createSupplier, updateSupplier, deleteSupplier, settleSupplierPayable, sendSupplierReminder } from '../controllers/supplier.controller';

const router = Router();
router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.get('/:id/payments', getSupplierPayments);
router.get('/:id/reminders', getSupplierReminders);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
router.post('/:id/settle', settleSupplierPayable);
router.post('/:id/remind', sendSupplierReminder);
export default router;