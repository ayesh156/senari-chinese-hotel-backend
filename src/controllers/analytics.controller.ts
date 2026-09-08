// 🌟 Native Node.js ESM Type-only import for Express
import type { Request, Response, NextFunction } from 'express';
// 🌟 Explicit type import for DateFilter
import { AnalyticsService, type DateFilter } from '../services/analytics.service.ts';

/**
 * Parses query parameters into a DateFilter object:
 *   filterType: day | week | month | year | range
 *   startDate:  YYYY-MM-DD (or YYYY-MM for month)
 *   endDate:    YYYY-MM-DD
 */
function parseDateFilter(req: Request): DateFilter {
  const { filterType, startDate, endDate } = req.query;
  const ft = (filterType as string) || 'week';
  const sd = startDate as string | undefined;
  const ed = endDate as string | undefined;
  return { filterType: ft, startDate: sd, endDate: ed };
}

export const getDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const [summary, revenueChart, topCategories, foodRankings] = await Promise.all([
      AnalyticsService.getDashboardSummary(dateFilter),
      AnalyticsService.getRevenueChartData(dateFilter),
      AnalyticsService.getTopCategories(dateFilter),
      AnalyticsService.getFoodRankings(dateFilter),
    ]);

    // Cache control: 30 seconds
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({
      success: true,
      data: {
        summary,
        revenueChart,
        topCategories,
        foodRankings,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const summary = await AnalyticsService.getDashboardSummary(dateFilter);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const getRevenueChart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const data = await AnalyticsService.getRevenueChartData(dateFilter);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getTopCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const data = await AnalyticsService.getTopCategories(dateFilter);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getFoodRankings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const data = await AnalyticsService.getFoodRankings(dateFilter);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getDetailedAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const [hourlyTraffic, inventoryEfficiency, paymentDistribution, profitableFoods] = await Promise.all([
      AnalyticsService.getHourlyTraffic(dateFilter),
      AnalyticsService.getInventoryEfficiency(dateFilter),
      AnalyticsService.getPaymentDistribution(dateFilter),
      AnalyticsService.getMostProfitableFoods(dateFilter),
    ]);

    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({
      success: true,
      data: {
        hourlyTraffic,
        inventoryEfficiency,
        paymentDistribution,
        profitableFoods,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getHourlyTrafficHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const data = await AnalyticsService.getHourlyTraffic(dateFilter);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getInventoryEfficiencyHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const data = await AnalyticsService.getInventoryEfficiency(dateFilter);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getPaymentDistributionHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const data = await AnalyticsService.getPaymentDistribution(dateFilter);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMostProfitableFoodsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateFilter = parseDateFilter(req);
    const data = await AnalyticsService.getMostProfitableFoods(dateFilter);
    res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
