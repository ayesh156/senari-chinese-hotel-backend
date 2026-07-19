import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

/**
 * GET /api/dashboard/summary
 * Returns the full today's operations snapshot.
 */
export const getDashboardSummary = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DashboardService.getSummary();
    res.set('Cache-Control', 'public, max-age=15, s-maxage=15');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/sales
 */
export const getTodaySales = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DashboardService.getTodaySales();
    res.set('Cache-Control', 'public, max-age=15, s-maxage=15');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/tables
 */
export const getOccupiedTables = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DashboardService.getOccupiedTables();
    res.set('Cache-Control', 'public, max-age=15, s-maxage=15');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/low-stock
 */
export const getLowStockAlerts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DashboardService.getLowStockAlerts();
    res.set('Cache-Control', 'public, max-age=15, s-maxage=15');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/payables
 */
export const getPendingPayables = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DashboardService.getPendingPayables();
    res.set('Cache-Control', 'public, max-age=15, s-maxage=15');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/sales-trend
 */
export const getTodaySalesTrend = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DashboardService.getTodaySalesTrend();
    res.set('Cache-Control', 'public, max-age=15, s-maxage=15');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/popular-categories
 */
export const getPopularCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await DashboardService.getPopularCategories();
    res.set('Cache-Control', 'public, max-age=15, s-maxage=15');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};