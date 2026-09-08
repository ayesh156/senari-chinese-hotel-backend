import { Router } from 'express';
import auditRoutes from './audit.routes.ts';
import authRoutes from './auth.routes.ts';
import foodRoutes from './food.routes.ts';
import categoryRoutes from './category.routes.ts';
import unitRoutes from './unit.routes.ts';
import orderRoutes from './order.routes.ts';
import inventoryRoutes from './inventory.routes.ts';
import customerRoutes from './customer.routes.ts';
import supplierRoutes from './supplier.routes.ts';
import purchaseOrderRoutes from './purchaseOrder.routes.ts';
import tableRoutes from './table.routes.ts';
import analyticsRoutes from './analytics.routes.ts';
import dashboardRoutes from './dashboard.routes.ts';
import invoiceRoutes from './invoice.routes.ts';
import settingsRoutes from './settings.routes.ts';
import userRoutes from './user.routes.ts';

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
