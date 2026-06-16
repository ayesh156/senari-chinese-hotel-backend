import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/units
router.get('/', async (_req: Request, res: Response) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { name: 'asc' },
    });
    console.log(`[DB] GET /units → ${units.length} rows`);
    res.json({ success: true, data: units });
  } catch (error) {
    console.error('[DB] GET /units ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch units' });
  }
});

// POST /api/units
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, abbreviation } = req.body;
    if (!name || !abbreviation) {
      res.status(400).json({ success: false, error: 'Name and abbreviation are required' });
      return;
    }
    const existing = await prisma.unit.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json({ success: false, error: 'A unit with this name already exists' });
      return;
    }
    const unit = await prisma.unit.create({
      data: { name, abbreviation },
    });
    console.log(`[DB] POST /units → created "${name}" (${abbreviation}) id=${unit.id}`);
    res.status(201).json({ success: true, data: unit });
  } catch (error) {
    console.error('[DB] POST /units ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to create unit' });
  }
});

// PUT /api/units/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, abbreviation } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }
    const existing = await prisma.unit.findUnique({ where: { name } });
    if (existing && existing.id !== id) {
      res.status(409).json({ success: false, error: 'A unit with this name already exists' });
      return;
    }
    const unit = await prisma.unit.update({
      where: { id },
      data: { name, abbreviation },
    });
    console.log(`[DB] PUT /units/${id} → updated`);
    res.json({ success: true, data: unit });
  } catch (error) {
    console.error('[DB] PUT /units ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to update unit' });
  }
});

// DELETE /api/units/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const inventoryCount = await prisma.inventoryItem.count({ where: { unitId: id } });
    if (inventoryCount > 0) {
      res.status(409).json({
        success: false,
        error: `Unit is referenced by ${inventoryCount} inventory item(s)`,
      });
      return;
    }
    await prisma.unit.delete({ where: { id } });
    console.log(`[DB] DELETE /units/${id} → deleted`);
    res.json({ success: true, data: null });
  } catch (error) {
    console.error('[DB] DELETE /units ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to delete unit' });
  }
});

export default router;