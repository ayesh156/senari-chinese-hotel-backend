import { Router } from 'express';
import { getTables, getTableById, createTable, updateTableStatus, deleteTable } from '../controllers/table.controller';

const router = Router();

router.get('/', getTables);
router.get('/:id', getTableById);
router.post('/', createTable);
router.patch('/:id/status', updateTableStatus);
router.delete('/:id', deleteTable);

export default router;