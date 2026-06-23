import { Router } from 'express';
import {
  getCustomers, getCustomerById, getCustomerPayments, getCustomerReminders,
  createCustomer, updateCustomer, deleteCustomer,
  settleCustomerDue, sendCustomerReminder,
} from '../controllers/customer.controller';
import { uploadCustomerAvatar } from '../middlewares/uploadCustomer.middleware';

const router = Router();

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.get('/:id/payments', getCustomerPayments);
router.get('/:id/reminders', getCustomerReminders);
router.post('/', uploadCustomerAvatar.single('avatar'), createCustomer);
router.put('/:id', uploadCustomerAvatar.single('avatar'), updateCustomer);
router.delete('/:id', deleteCustomer);
router.post('/:id/settle', settleCustomerDue);
router.post('/:id/remind', sendCustomerReminder);

export default router;