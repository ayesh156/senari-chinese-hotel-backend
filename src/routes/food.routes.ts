import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/foods
router.get('/', async (_req: Request, res: Response) => {
  try {
    const foods = await prisma.foodItem.findMany({
      include: {
        category: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: foods });
  } catch (error) {
    console.error('Error fetching foods:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;