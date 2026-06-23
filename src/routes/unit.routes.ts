import { Router } from 'express';
import { getUnits, createUnit, updateUnit, deleteUnit } from '../controllers/unit.controller';

const router = Router();

// GET /api/units
router.get('/', getUnits);
// POST /api/units
router.post('/', createUnit);
// PUT /api/units/:id
router.put('/:id', updateUnit);
// DELETE /api/units/:id
router.delete('/:id', deleteUnit);

export default router;