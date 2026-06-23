import { Router } from 'express';
import { getFoods, getFoodById, createFood, updateFood, deleteFood } from '../controllers/food.controller';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

// GET /api/foods — new items first
router.get('/', getFoods);
// GET /api/foods/:id — single food item
router.get('/:id', getFoodById);
// POST /api/foods — multipart/form-data (field: image)
router.post('/', upload.single('image'), createFood);
// PUT /api/foods/:id — multipart/form-data (field: image, optional)
router.put('/:id', upload.single('image'), updateFood);
// DELETE /api/foods/:id
router.delete('/:id', deleteFood);

export default router;