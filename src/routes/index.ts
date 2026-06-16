import { Router } from 'express';
import authRoutes from './auth.routes';
import foodRoutes from './food.routes';
import categoryRoutes from './category.routes';
import unitRoutes from './unit.routes';
import orderRoutes from './order.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/foods', foodRoutes);
router.use('/categories', categoryRoutes);
router.use('/units', unitRoutes);
router.use('/orders', orderRoutes);

export default router;
