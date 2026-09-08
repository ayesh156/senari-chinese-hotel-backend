import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import {
  getDashboardSummary,
  getTodaySales,
  getOccupiedTables,
  getLowStockAlerts,
  getPendingPayables,
  getTodaySalesTrend,
  getPopularCategories,
} from '../controllers/dashboard.controller.ts';

const router = Router();

// Dashboard data — all authenticated roles can view
router.get('/summary', authMiddleware, getDashboardSummary);
router.get('/sales', authMiddleware, getTodaySales);
router.get('/tables', authMiddleware, getOccupiedTables);
router.get('/low-stock', authMiddleware, getLowStockAlerts);
router.get('/payables', authMiddleware, getPendingPayables);
router.get('/sales-trend', authMiddleware, getTodaySalesTrend);
router.get('/popular-categories', authMiddleware, getPopularCategories);

export default router;