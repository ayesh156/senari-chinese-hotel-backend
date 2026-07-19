import { Router } from 'express';
import {
  getDashboardSummary,
  getTodaySales,
  getOccupiedTables,
  getLowStockAlerts,
  getPendingPayables,
  getTodaySalesTrend,
  getPopularCategories,
} from '../controllers/dashboard.controller';

const router = Router();

router.get('/summary', getDashboardSummary);
router.get('/sales', getTodaySales);
router.get('/tables', getOccupiedTables);
router.get('/low-stock', getLowStockAlerts);
router.get('/payables', getPendingPayables);
router.get('/sales-trend', getTodaySalesTrend);
router.get('/popular-categories', getPopularCategories);

export default router;