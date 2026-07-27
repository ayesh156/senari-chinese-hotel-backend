import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware';
import { getSettings, updateSettings } from '../controllers/settings.controller';

const router = Router();

// GET /api/settings — Public read access (no auth required)
router.get('/', getSettings);
// PUT /api/settings — Only ADMIN can update system settings
router.put('/', authMiddleware, authorize('ADMIN'), updateSettings);

export default router;