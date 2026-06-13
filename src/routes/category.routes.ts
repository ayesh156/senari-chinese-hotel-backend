import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/categories?type=FOOD|INVENTORY
router.get('/', async (req: Request, res: Response) => {
  try {
    const typeFilter = req.query.type as string | undefined;
    const where = typeFilter ? { type: typeFilter } : {};
    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    console.log(`[DB] GET /categories?type=${typeFilter} → ${categories.length} rows`);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('[DB] GET /categories ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

// POST /api/categories
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type } = req.body;
    if (!name || !type) {
      res.status(400).json({ success: false, error: 'Name and type are required' });
      return;
    }
    if (!['FOOD', 'INVENTORY'].includes(type)) {
      res.status(400).json({ success: false, error: 'Type must be FOOD or INVENTORY' });
      return;
    }
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json({ success: false, error: 'A category with this name already exists' });
      return;
    }
    const category = await prisma.category.create({
      data: { name, type },
    });
    console.log(`[DB] POST /categories → created "${name}" (${type}) id=${category.id}`);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('[DB] POST /categories ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }
    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      res.status(409).json({ success: false, error: 'A category with this name already exists' });
      return;
    }
    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });
    console.log(`[DB] PUT /categories/${id} → renamed to "${name}"`);
    res.json({ success: true, data: category });
  } catch (error) {
    console.error('[DB] PUT /categories ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const foodCount = await prisma.foodItem.count({ where: { categoryId: id } });
    const inventoryCount = await prisma.inventoryItem.count({ where: { categoryId: id } });
    if (foodCount > 0 || inventoryCount > 0) {
      res.status(409).json({
        success: false,
        error: `Category is referenced by ${foodCount + inventoryCount} item(s)`,
      });
      return;
    }
    await prisma.category.delete({ where: { id } });
    console.log(`[DB] DELETE /categories/${id} → deleted`);
    res.json({ success: true, data: null });
  } catch (error) {
    console.error('[DB] DELETE /categories ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to delete category' });
  }
});

export default router;