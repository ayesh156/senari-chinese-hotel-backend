import { Router } from 'express';
import auditRoutes from './audit.routes';
import authRoutes from './auth.routes';
import foodRoutes from './food.routes';
import categoryRoutes from './category.routes';
import unitRoutes from './unit.routes';
import orderRoutes from './order.routes';
import inventoryRoutes from './inventory.routes';
import customerRoutes from './customer.routes';
import supplierRoutes from './supplier.routes';
import purchaseOrderRoutes from './purchaseOrder.routes';
import tableRoutes from './table.routes';
import analyticsRoutes from './analytics.routes';
import dashboardRoutes from './dashboard.routes';
import invoiceRoutes from './invoice.routes';
import settingsRoutes from './settings.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/audit-logs', auditRoutes);
router.use('/auth', authRoutes);
router.use('/foods', foodRoutes);
router.use('/categories', categoryRoutes);
router.use('/units', unitRoutes);
router.use('/orders', orderRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/tables', tableRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/settings', settingsRoutes);
router.use('/users', userRoutes);

export default router;
