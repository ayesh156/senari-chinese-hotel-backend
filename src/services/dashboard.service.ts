import prisma from '../lib/prisma.ts';

/**
 * High-performance Dashboard Analytics Service
 * Single-roundtrip design for real-time "Today's Operations" snapshot.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface TodaySales {
  revenue: number;
  completedOrders: number;
}

export interface OccupiedTables {
  occupied: number;
  total: number;
}

export interface LowStockAlert {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  minAlertLevel: number;
  unit: string;
}

export interface PendingPayables {
  totalOutstanding: number;
  supplierCount: number;
}

export interface SalesTrendEntry {
  hour: string;
  revenue: number;
}

export interface PopularCategoryEntry {
  name: string;
  pct: number;
  revenue: number;
  fill: string;
  orderCount: number;
}

export interface DashboardSummary {
  todaySales: TodaySales;
  occupiedTables: OccupiedTables;
  lowStockAlerts: {
    count: number;
    items: LowStockAlert[];
  };
  pendingPayables: PendingPayables;
  todaySalesTrend: SalesTrendEntry[];
  popularCategories: PopularCategoryEntry[];
  timestamp: string;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class DashboardService {
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();
  private static CACHE_TTL = 15_000; // 15 seconds (fast refresh for live ops)

  private static getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data as T;
    }
    return null;
  }

  private static setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /** Build start-of-today boundary */
  private static getTodayStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * getTodaySales — total revenue and completed order count for today
   */
  static async getTodaySales(): Promise<TodaySales> {
    const cacheKey = 'dash_today_sales';
    const cached = this.getCached<TodaySales>(cacheKey);
    if (cached) return cached;

    const todayStart = this.getTodayStart();
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const [revenueAgg, orderCount] = await Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          paymentStatus: { in: ['PAID', 'PARTIAL'] },
          status: { not: 'CANCELLED' },
        },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: 'COMPLETED',
        },
      }),
    ]);

    const result: TodaySales = {
      revenue: Number(revenueAgg._sum.total || 0),
      completedOrders: orderCount,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getOccupiedTables — count of OCCUPIED tables vs total
   */
  static async getOccupiedTables(): Promise<OccupiedTables> {
    const cacheKey = 'dash_occupied_tables';
    const cached = this.getCached<OccupiedTables>(cacheKey);
    if (cached) return cached;

    const [total, occupied] = await Promise.all([
      prisma.restaurantTable.count(),
      prisma.restaurantTable.count({
        where: { status: 'OCCUPIED' },
      }),
    ]);

    const result: OccupiedTables = { total, occupied };
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getLowStockAlerts — items where quantity <= minAlertLevel
   */
  static async getLowStockAlerts(): Promise<{ count: number; items: LowStockAlert[] }> {
    const cacheKey = 'dash_low_stock';
    const cached = this.getCached<{ count: number; items: LowStockAlert[] }>(cacheKey);
    if (cached) return cached;

    // Fetch the global lowStockThreshold from system_settings
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    const globalThreshold = settings?.lowStockThreshold ?? 2;

    // Use raw SQL for column-to-column comparison (Prisma does not support
    // comparing one column against another in a where clause).
    // Logic: quantity > 0 AND quantity <= item's minAlertLevel
    // (or global threshold when per-item minAlertLevel is 0).
    const rawItems = await prisma.$queryRawUnsafe<Array<{
      id: number;
      name: string;
      sku: string;
      quantity: number;
      minAlertLevel: number;
      unitAbbr: string;
    }>>(
      `SELECT 
        ii.id, ii.name, ii.sku,
        CAST(ii.quantity AS DECIMAL(10,2)) as quantity,
        CAST(ii.minAlertLevel AS DECIMAL(10,2)) as minAlertLevel,
        u.abbreviation as unitAbbr
      FROM inventory_items ii
      JOIN units u ON u.id = ii.unitId
      WHERE ii.quantity > 0
        AND ii.quantity <= COALESCE(NULLIF(ii.minAlertLevel, 0), ${globalThreshold})
      ORDER BY ii.quantity ASC
      LIMIT 20`
    );

    const alerts = rawItems.map(r => ({
      id: Number(r.id),
      name: r.name,
      sku: r.sku,
      quantity: Number(r.quantity) || 0,
      minAlertLevel: Number(r.minAlertLevel) || 0,
      unit: r.unitAbbr,
    }));

    const result = { count: alerts.length, items: alerts };
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getPendingPayables — total outstanding balance from POs
   */
  static async getPendingPayables(): Promise<PendingPayables> {
    const cacheKey = 'dash_pending_payables';
    const cached = this.getCached<PendingPayables>(cacheKey);
    if (cached) return cached;

    const agg = await prisma.purchaseOrder.aggregate({
      where: {
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      _sum: { totalAmount: true, amountPaid: true },
    });

    const totalAmount = Number(agg._sum.totalAmount || 0);
    const amountPaid = Number(agg._sum.amountPaid || 0);
    const totalOutstanding = Math.max(0, totalAmount - amountPaid);

    const supplierCount = await prisma.supplier.count({
      where: { payableAmount: { gt: 0 } },
    });

    const result: PendingPayables = { totalOutstanding, supplierCount };
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getTodaySalesTrend — hourly revenue for today (8AM – 9PM)
   */
  static async getTodaySalesTrend(): Promise<SalesTrendEntry[]> {
    const cacheKey = 'dash_today_trend';
    const cached = this.getCached<SalesTrendEntry[]>(cacheKey);
    if (cached) return cached;

    const todayStart = this.getTodayStart();
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const raw = await prisma.$queryRawUnsafe<Array<{
      hour: number;
      revenue: number;
    }>>(
      `SELECT 
        HOUR(createdAt) as hour,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE createdAt >= ?
        AND createdAt < ?
        AND paymentStatus IN ('PAID', 'PARTIAL')
        AND status != 'CANCELLED'
      GROUP BY HOUR(createdAt)
      ORDER BY hour ASC`,
      todayStart,
      todayEnd
    );

    const hourMap = new Map<number, number>();
    for (const row of raw) {
      hourMap.set(Number(row.hour), Number(row.revenue) || 0);
    }

    const HOUR_LABELS = [
      '8 AM', '9 AM', '10 AM', '11 AM',
      '12 PM', '1 PM', '2 PM', '3 PM',
      '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM',
    ];

    const result: SalesTrendEntry[] = [];
    for (let h = 8; h <= 21; h++) {
      result.push({
        hour: HOUR_LABELS[h - 8],
        revenue: hourMap.get(h) || 0,
      });
    }

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getPopularCategories — sales distribution by category for today
   */
  static async getPopularCategories(): Promise<PopularCategoryEntry[]> {
    const cacheKey = 'dash_popular_categories';
    const cached = this.getCached<PopularCategoryEntry[]>(cacheKey);
    if (cached) return cached;

    const todayStart = this.getTodayStart();
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);

    const raw = await prisma.$queryRawUnsafe<Array<{
      categoryName: string;
      revenue: number;
      orderCount: bigint;
    }>>(
      `SELECT 
        c.name as categoryName,
        COALESCE(SUM(oi.subtotal), 0) as revenue,
        COUNT(DISTINCT o.id) as orderCount
      FROM order_items oi
      JOIN food_items fi ON fi.id = oi.foodId
      JOIN categories c ON c.id = fi.categoryId AND c.type = 'FOOD'
      JOIN orders o ON o.id = oi.orderId
      WHERE o.createdAt >= ?
        AND o.createdAt < ?
        AND o.paymentStatus IN ('PAID', 'PARTIAL')
        AND o.status != 'CANCELLED'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC`,
      todayStart,
      todayEnd
    );

    const totalRevenue = raw.reduce((s, r) => s + Number(r.revenue || 0), 0) || 1;

    const PIE_COLORS = [
      '#F59E0B', '#3B82F6', '#A855F7', '#14B8A6',
      '#EC4899', '#EF4444', '#06B6D4', '#84CC16',
      '#F97316', '#6366F1',
    ];

    const result: PopularCategoryEntry[] = raw.map((r, i) => ({
      name: r.categoryName,
      revenue: Number(r.revenue) || 0,
      pct: Math.round((Number(r.revenue || 0) / totalRevenue) * 100),
      orderCount: Number(r.orderCount) || 0,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getSummary — aggregates all dashboard data in parallel (single round-trip)
   */
  static async getSummary(): Promise<DashboardSummary> {
    const cacheKey = 'dash_summary';
    const cached = this.getCached<DashboardSummary>(cacheKey);
    if (cached) return cached;

    const [
      todaySales,
      occupiedTables,
      lowStockAlerts,
      pendingPayables,
      todaySalesTrend,
      popularCategories,
    ] = await Promise.all([
      this.getTodaySales(),
      this.getOccupiedTables(),
      this.getLowStockAlerts(),
      this.getPendingPayables(),
      this.getTodaySalesTrend(),
      this.getPopularCategories(),
    ]);

    const result: DashboardSummary = {
      todaySales,
      occupiedTables,
      lowStockAlerts,
      pendingPayables,
      todaySalesTrend,
      popularCategories,
      timestamp: new Date().toISOString(),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /** Clear cache (call after new orders / inventory changes) */
  static invalidateCache() {
    this.cache.clear();
  }
}
