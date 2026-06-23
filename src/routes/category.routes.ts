import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';

const router = Router();

// GET /api/categories?type=FOOD|INVENTORY
router.get('/', getCategories);
// POST /api/categories
router.post('/', createCategory);
// PUT /api/categories/:id
router.put('/:id', updateCategory);
// DELETE /api/categories/:id
router.delete('/:id', deleteCategory);

export default router;