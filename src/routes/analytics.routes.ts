import { Router } from 'express';
import { getDashboard, getDashboardSummary, getRevenueChart, getTopCategories, getFoodRankings, getDetailedAnalytics, getHourlyTrafficHandler, getInventoryEfficiencyHandler, getPaymentDistributionHandler, getMostProfitableFoodsHandler } from '../controllers/analytics.controller';

const router = Router();

router.get('/dashboard', getDashboard);
router.get('/dashboard/summary', getDashboardSummary);
router.get('/dashboard/revenue-chart', getRevenueChart);
router.get('/dashboard/top-categories', getTopCategories);
router.get('/dashboard/food-rankings', getFoodRankings);

// Detailed analytics (new BI features)
router.get('/detailed', getDetailedAnalytics);
router.get('/detailed/hourly-traffic', getHourlyTrafficHandler);
router.get('/detailed/inventory-efficiency', getInventoryEfficiencyHandler);
router.get('/detailed/payment-distribution', getPaymentDistributionHandler);
router.get('/detailed/most-profitable-foods', getMostProfitableFoodsHandler);

export default router;
