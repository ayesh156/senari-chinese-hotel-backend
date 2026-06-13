import { Router } from 'express';
import authRoutes from './auth.routes';
import foodRoutes from './food.routes';
import categoryRoutes from './category.routes';
import unitRoutes from './unit.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/foods', foodRoutes);
router.use('/categories', categoryRoutes);
router.use('/units', unitRoutes);

export default router;