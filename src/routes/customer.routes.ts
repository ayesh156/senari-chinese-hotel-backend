import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import {
  getCustomers, getCustomerById, getCustomerPayments, getCustomerReminders,
  createCustomer, updateCustomer, deleteCustomer,
  settleCustomerDue, sendCustomerReminder,
} from '../controllers/customer.controller.ts';
import { uploadCustomerAvatar } from '../middlewares/uploadCustomer.middleware.ts';

const router = Router();

// Read — all authenticated
router.get('/', authMiddleware, getCustomers);
router.get('/:id', authMiddleware, getCustomerById);
router.get('/:id/payments', authMiddleware, getCustomerPayments);
router.get('/:id/reminders', authMiddleware, getCustomerReminders);
// Write — ADMIN/MANAGER/CASHIER
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER', 'CASHIER'), uploadCustomerAvatar.single('avatar'), createCustomer);
router.put('/:id', authMiddleware, authorize('ADMIN', 'MANAGER', 'CASHIER'), uploadCustomerAvatar.single('avatar'), updateCustomer);
router.delete('/:id', authMiddleware, authorize('ADMIN'), deleteCustomer);
router.post('/:id/settle', authMiddleware, authorize('ADMIN', 'MANAGER'), settleCustomerDue);
router.post('/:id/remind', authMiddleware, authorize('ADMIN', 'MANAGER', 'CASHIER'), sendCustomerReminder);

export default router;