import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware';
import { getFoods, getFoodById, getPopularFoods, createFood, updateFood, deleteFood } from '../controllers/food.controller';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// GET /api/foods — public read access (no auth required)
router.get('/', getFoods);
// GET /api/foods/popular — PUBLIC: top selling items for current month
router.get('/popular', getPopularFoods);
// GET /api/foods/:id — public single food item
router.get('/:id', getFoodById);
// POST /api/foods — ADMIN/MANAGER can create
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER'), upload.single('image'), createFood);
// PUT /api/foods/:id — ADMIN/MANAGER can update
router.put('/:id', authMiddleware, authorize('ADMIN', 'MANAGER'), upload.single('image'), updateFood);
// DELETE /api/foods/:id — ADMIN only
router.delete('/:id', authMiddleware, authorize('ADMIN'), deleteFood);

export default router;