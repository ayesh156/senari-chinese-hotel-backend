import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.ts';

const router = Router();

// GET /api/categories?type=FOOD|INVENTORY — publicly accessible read
router.get('/', getCategories);
// POST /api/categories — ADMIN/MANAGER can create
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER'), createCategory);
// PUT /api/categories/:id — ADMIN/MANAGER can update
router.put('/:id', authMiddleware, authorize('ADMIN', 'MANAGER'), updateCategory);
// DELETE /api/categories/:id — ADMIN only
router.delete('/:id', authMiddleware, authorize('ADMIN'), deleteCategory);

export default router;