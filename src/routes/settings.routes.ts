import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import { getSettings, updateSettings } from '../controllers/settings.controller.ts';

const router = Router();

// GET /api/settings — Public read access (no auth required)
router.get('/', getSettings);
// PUT /api/settings — Only ADMIN can update system settings
router.put('/', authMiddleware, authorize('ADMIN'), updateSettings);

export default router;