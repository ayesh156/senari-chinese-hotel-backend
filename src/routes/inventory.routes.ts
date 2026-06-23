import { Router } from 'express';
import {
  getInventoryItems,
  getInventoryItemById,
  getInventoryItemHistory,
  createInventoryItem,
  updateInventoryItem,
  adjustInventoryItemStock,
  deleteInventoryItem,
} from '../controllers/inventory.controller';

const router = Router();

// GET /api/inventory
router.get('/', getInventoryItems);
// GET /api/inventory/:id
router.get('/:id', getInventoryItemById);
// GET /api/inventory/:id/history
router.get('/:id/history', getInventoryItemHistory);
// POST /api/inventory
router.post('/', createInventoryItem);
// PUT /api/inventory/:id
router.put('/:id', updateInventoryItem);
// PUT /api/inventory/:id/adjust
router.put('/:id/adjust', adjustInventoryItemStock);
// DELETE /api/inventory/:id
router.delete('/:id', deleteInventoryItem);

export default router;