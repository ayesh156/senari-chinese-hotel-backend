import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware';
import { getTables, getTableById, createTable, updateTableStatus, deleteTable } from '../controllers/table.controller';

const router = Router();

// Read — all authenticated
router.get('/', authMiddleware, getTables);
router.get('/:id', authMiddleware, getTableById);
// Write — ADMIN/MANAGER can create and delete tables
router.post('/', authMiddleware, authorize('ADMIN', 'MANAGER'), createTable);
router.patch('/:id/status', authMiddleware, updateTableStatus); // Status updates OK for all staff
router.delete('/:id', authMiddleware, authorize('ADMIN'), deleteTable);

export default router;