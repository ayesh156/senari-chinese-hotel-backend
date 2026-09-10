import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import { getFoods, getFoodById, getPopularFoods, createFood, updateFood, deleteFood } from '../controllers/food.controller.ts';
import { upload } from '../middlewares/upload.middleware.ts';

const router = Router();

// GET /api/foods — public read access (no auth required)
router.get('/', getFoods);
// GET /api/foods/popular — PUBLIC: top selling items for current month
router.get('/popular', getPopularFoods);
// GET /api/foods/:id — public single food item
router.get('/:id', getFoodById);
// 🌟 Safe Multer Wrapper: Accepts either 'images' or 'image' field without throwing unhandled 500 errors
const safeUpload = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'image', maxCount: 1 },
]);

const handleUpload = (req: any, res: any, next: any) => {
  safeUpload(req, res, (err: any) => {
    if (err) {
      console.warn('[Upload Warning]:', err.message);
      // Continue to controller even if single file fails, avoiding complete 500 crash
    }
    // Normalize files into req.files array for controller compatibility
    if (req.files && !Array.isArray(req.files)) {
      const filesMap = req.files as Record<string, Express.Multer.File[]>;
      req.files = [...(filesMap.images || []), ...(filesMap.image || [])];
    }
    next();
  });
};

// POST /api/foods — ADMIN/MANAGER can create with multiple images support
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER'), handleUpload, createFood);
// PUT /api/foods/:id — ADMIN/MANAGER can update with multiple images support
router.put('/:id', authMiddleware, authorize('ADMIN', 'MANAGER'), handleUpload, updateFood);
// DELETE /api/foods/:id — ADMIN only
router.delete('/:id', authMiddleware, authorize('ADMIN'), deleteFood);

export default router;