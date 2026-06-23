import { Router } from 'express';
import authRoutes from './auth.routes';
import foodRoutes from './food.routes';
import categoryRoutes from './category.routes';
import unitRoutes from './unit.routes';
import orderRoutes from './order.routes';
import inventoryRoutes from './inventory.routes';
import customerRoutes from './customer.routes';
import supplierRoutes from './supplier.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/foods', foodRoutes);
router.use('/categories', categoryRoutes);
router.use('/units', unitRoutes);
router.use('/orders', orderRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/customers', customerRoutes);
router.use('/suppliers', supplierRoutes);

export default router;
