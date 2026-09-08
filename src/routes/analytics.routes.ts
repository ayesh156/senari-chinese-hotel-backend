import { Router } from 'express';
import { authMiddleware, authorize } from '../middlewares/auth.middleware.ts';
import { getDashboard, getDashboardSummary, getRevenueChart, getTopCategories, getFoodRankings, getDetailedAnalytics, getHourlyTrafficHandler, getInventoryEfficiencyHandler, getPaymentDistributionHandler, getMostProfitableFoodsHandler } from '../controllers/analytics.controller.ts';

const router = Router();

// All analytics routes require authentication
// Financial reports/analytics require at least MANAGER or ADMIN
router.get('/dashboard', authMiddleware, authorize('ADMIN', 'MANAGER'), getDashboard);
router.get('/dashboard/summary', authMiddleware, authorize('ADMIN', 'MANAGER', 'CASHIER'), getDashboardSummary);
router.get('/dashboard/revenue-chart', authMiddleware, authorize('ADMIN', 'MANAGER'), getRevenueChart);
router.get('/dashboard/top-categories', authMiddleware, authorize('ADMIN', 'MANAGER', 'CASHIER'), getTopCategories);
router.get('/dashboard/food-rankings', authMiddleware, authorize('ADMIN', 'MANAGER'), getFoodRankings);

// Detailed analytics (new BI features) — ADMIN/MANAGER only
router.get('/detailed', authMiddleware, authorize('ADMIN', 'MANAGER'), getDetailedAnalytics);
router.get('/detailed/hourly-traffic', authMiddleware, authorize('ADMIN', 'MANAGER'), getHourlyTrafficHandler);
router.get('/detailed/inventory-efficiency', authMiddleware, authorize('ADMIN', 'MANAGER'), getInventoryEfficiencyHandler);
router.get('/detailed/payment-distribution', authMiddleware, authorize('ADMIN', 'MANAGER'), getPaymentDistributionHandler);
router.get('/detailed/most-profitable-foods', authMiddleware, authorize('ADMIN', 'MANAGER'), getMostProfitableFoodsHandler);

export default router;