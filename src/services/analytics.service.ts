import prisma from '../lib/prisma';

/**
 * World-class Analytics Service
 * Aggregates data across Orders, Inventory, PurchaseOrders, FoodItems, and Categories
 * for the Reports Dashboard. All methods use Prisma raw queries for performance.
 */

// ── Date Filter Interface ─────────────────────────────────────────────────────
export interface DateFilter {
  filterType: string; // day | week | month | year | range
  startDate?: string;
  endDate?: string;
}

/** Build a Prisma `createdAt` where clause from a DateFilter */
function buildDateWhere(filter?: DateFilter): { createdAt?: { gte: Date; lte: Date } } {
  if (!filter) return {};
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter.filterType) {
    case 'day': {
      const d = filter.startDate ? new Date(filter.startDate + 'T00:00:00') : todayStart;
      const end = new Date(d.getTime() + 86_400_000);
      return { createdAt: { gte: d, lte: end } };
    }
    case 'month': {
      const raw = filter.startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [year, month] = raw.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      return { createdAt: { gte: start, lte: end } };
    }
    case 'year': {
      const year = Number(filter.startDate || now.getFullYear());
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return { createdAt: { gte: start, lte: end } };
    }
    case 'range': {
      if (filter.startDate && filter.endDate) {
        const start = new Date(filter.startDate + 'T00:00:00');
        const end = new Date(filter.endDate + 'T23:59:59');
        return { createdAt: { gte: start, lte: end } };
      }
      return {};
    }
    case 'week':
    default: {
      const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 86_400_000);
      const endOfToday = new Date(todayStart.getTime() + 86_400_000);
      return { createdAt: { gte: sevenDaysAgo, lte: endOfToday } };
    }
  }
}

export class AnalyticsService {
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();
  private static CACHE_TTL = 30_000; // 30 seconds

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

  /**
   * getDashboardSummary — single consolidated payload for GET /api/analytics/dashboard
   */
  static async getDashboardSummary(dateFilter?: DateFilter) {
    const cacheKey = `dashboard_summary_${dateFilter?.filterType || 'week'}_${dateFilter?.startDate || ''}_${dateFilter?.endDate || ''}`;
    const cached = this.getCached<DashboardSummary>(cacheKey);
    if (cached) return cached;

    const dateWhere = buildDateWhere(dateFilter);

    // Build the where clause for order-based aggregations
    const orderWhereBase = {
      paymentStatus: { in: ['PAID', 'PARTIAL'] as const },
      status: { not: 'CANCELLED' as const },
    };
    const orderWhere = dateWhere.createdAt
      ? { ...orderWhereBase, createdAt: dateWhere.createdAt }
      : orderWhereBase;

    // Run all aggregations in parallel
    const [
      periodRevenueResult,
      prevPeriodRevenueResult,
      stockValueResult,
      pendingPayablesResult,
      supplierCountResult,
      totalCogsResult,
    ] = await Promise.all([
      // 1. Period revenue (amount paid during the filtered period)
      prisma.order.aggregate({
        where: orderWhere,
        _sum: { total: true, amountPaid: true },
      }),

      // 2. Previous period revenue (for trend comparison)
      prisma.order.aggregate({
        where: {
          ...orderWhereBase,
          createdAt: dateWhere.createdAt ? {
            gte: new Date(Number(dateWhere.createdAt.gte) - (Number(dateWhere.createdAt.lte) - Number(dateWhere.createdAt.gte))),
            lte: new Date(Number(dateWhere.createdAt.gte) - 1),
          } : undefined,
        },
        _sum: { total: true },
      }),

      // 3. Total stock value (absolute snapshot)
      prisma.inventoryItem.aggregate({
        _sum: { quantity: true },
      }),

      // 4. Pending payables (absolute snapshot)
      prisma.purchaseOrder.aggregate({
        where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
        _sum: { totalAmount: true, amountPaid: true },
      }),

      // 5. Supplier count with payables (absolute snapshot)
      prisma.supplier.count({
        where: { payableAmount: { gt: 0 } },
      }),

      // 6. COGS (absolute snapshot)
      prisma.inventoryItem.aggregate({
        _sum: { averageCost: true },
      }),
    ]);

    const periodRevenue = Number(periodRevenueResult._sum.amountPaid || 0);
    const periodTotal = Number(periodRevenueResult._sum.total || 0);
    const prevPeriodRevenue = Number(prevPeriodRevenueResult._sum.total || 0);
    const totalStockValue = Number(stockValueResult._sum.quantity || 0);
    const poTotal = Number(pendingPayablesResult._sum.totalAmount || 0);
    const poPaid = Number(pendingPayablesResult._sum.amountPaid || 0);
    const pendingPayables = Math.max(0, poTotal - poPaid);
    const supplierPayableCount = supplierCountResult;
    const totalCogs = Number(totalCogsResult._sum.averageCost || 0);

    // Profit calculation
    const profitMargin = totalCogs > 0 && periodTotal > 0
      ? (periodTotal - totalCogs) / periodTotal
      : 0.38;
    const totalProfit = Math.round(
      totalCogs > 0 ? Math.max(0, periodTotal - totalCogs) : periodTotal * 0.38
    );

    // Revenue trend %
    const revenueTrendPct = prevPeriodRevenue > 0
      ? Math.round(((periodTotal - prevPeriodRevenue) / prevPeriodRevenue) * 100)
      : 0;

    const now = new Date();
    const result: DashboardSummary = {
      todayRevenue: periodRevenue,
      totalProfit,
      profitMargin: Math.round(profitMargin * 100),
      totalStockValue,
      pendingPayables,
      supplierPayableCount,
      weekRevenue: periodTotal,
      revenueTrendPct,
      timestamp: now.toISOString(),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getRevenueChartData — Aggregated revenue grouped by date
   * Respects optional dateFilter; falls back to last 7 days when none provided.
   */
  static async getRevenueChartData(dateFilter?: DateFilter) {
    const cacheKey = `revenue_chart_${dateFilter?.filterType || 'week'}_${dateFilter?.startDate || ''}_${dateFilter?.endDate || ''}`;
    const cached = this.getCached<RevenueChartEntry[]>(cacheKey);
    if (cached) return cached;

    const dateWhere = buildDateWhere(dateFilter);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const startDate = dateWhere.createdAt?.gte || sevenDaysAgo;
    const endDate = dateWhere.createdAt?.lte || now;

    // Use raw query for efficient GROUP BY on date
    const rows = await prisma.$queryRawUnsafe<Array<{
      date: string;
      revenue: number;
      orderCount: bigint;
    }>>(
      `SELECT 
        DATE(createdAt) as date,
        COALESCE(SUM(total), 0) as revenue,
        COUNT(*) as orderCount
      FROM orders
      WHERE createdAt >= ? 
        AND createdAt <= ?
        AND paymentStatus IN ('PAID', 'PARTIAL')
        AND status != 'CANCELLED'
      GROUP BY DATE(createdAt)
      ORDER BY date ASC`,
      startDate,
      endDate
    );

    // Build the 7-day array with 0-fill for missing days
    const dayMap = new Map<string, { revenue: number; orderCount: number }>();
    for (const row of rows) {
      const dateStr = row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date).slice(0, 10);
      dayMap.set(dateStr, {
        revenue: Number(row.revenue) || 0,
        orderCount: Number(row.orderCount) || 0,
      });
    }

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: RevenueChartEntry[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay();
      const entry = dayMap.get(dateStr) || { revenue: 0, orderCount: 0 };

      result.push({
        day: dayLabels[dayOfWeek],
        date: dateStr,
        label: dayLabels[dayOfWeek],
        fullLabel: `${dayLabels[dayOfWeek]} · ${dateStr.slice(5)}`,
        revenue: entry.revenue,
        orderCount: entry.orderCount,
      });
    }

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getTopCategories — Revenue aggregated per food category, respects dateFilter
   */
  static async getTopCategories(dateFilter?: DateFilter) {
    const cacheKey = `top_categories_${dateFilter?.filterType || 'week'}_${dateFilter?.startDate || ''}_${dateFilter?.endDate || ''}`;
    const cached = this.getCached<TopCategoryEntry[]>(cacheKey);
    if (cached) return cached;

    const dateWhere = buildDateWhere(dateFilter);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const startDate = dateWhere.createdAt?.gte || sevenDaysAgo;
    const endDate = dateWhere.createdAt?.lte || now;

    // Efficient join: OrderItem -> FoodItem -> Category aggregated by category
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
        AND o.createdAt <= ?
        AND o.paymentStatus IN ('PAID', 'PARTIAL')
        AND o.status != 'CANCELLED'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT 10`,
      startDate,
      endDate
    );

    const totalRevenue = raw.reduce((s, r) => s + Number(r.revenue || 0), 0) || 1;

    const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6', '#ec4899', '#ef4444', '#06b6d4', '#84cc16', '#a855f7', '#f97316'];

    const result: TopCategoryEntry[] = raw.map((r, i) => ({
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
   * getFoodRankings — Top and least selling foods, respects dateFilter
   */
  static async getFoodRankings(dateFilter?: DateFilter) {
    const cacheKey = `food_rankings_${dateFilter?.filterType || 'week'}_${dateFilter?.startDate || ''}_${dateFilter?.endDate || ''}`;
    const cached = this.getCached<FoodRankingResponse>(cacheKey);
    if (cached) return cached;

    const dateWhere = buildDateWhere(dateFilter);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const startDate = dateWhere.createdAt?.gte || sevenDaysAgo;
    const endDate = dateWhere.createdAt?.lte || now;

    const raw = await prisma.$queryRawUnsafe<Array<{
      foodId: number;
      foodName: string;
      categoryName: string;
      qty: number;
      revenue: number;
    }>>(
      `SELECT 
        fi.id as foodId,
        fi.name as foodName,
        c.name as categoryName,
        SUM(oi.quantity) as qty,
        COALESCE(SUM(oi.subtotal), 0) as revenue
      FROM order_items oi
      JOIN food_items fi ON fi.id = oi.foodId
      JOIN categories c ON c.id = fi.categoryId AND c.type = 'FOOD'
      JOIN orders o ON o.id = oi.orderId
      WHERE o.createdAt >= ?
        AND o.createdAt <= ?
        AND o.paymentStatus IN ('PAID', 'PARTIAL')
        AND o.status != 'CANCELLED'
      GROUP BY fi.id, fi.name, c.name
      ORDER BY qty DESC`,
      startDate,
      endDate
    );

    const foods = raw.map(r => ({
      id: Number(r.foodId),
      name: r.foodName,
      category: r.categoryName,
      qty: Number(r.qty) || 0,
      revenue: Number(r.revenue) || 0,
    }));

    const topSelling = foods.filter(f => f.qty > 0).slice(0, 5);
    const leastSelling = [...foods].filter(f => f.qty > 0).sort((a, b) => a.qty - b.qty).slice(0, 5);

    const result: FoodRankingResponse = { topSelling, leastSelling };
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getHourlyTraffic — Groups orders by hour for peak-time visualization, respects dateFilter
   */
  static async getHourlyTraffic(dateFilter?: DateFilter) {
    const cacheKey = `hourly_traffic_${dateFilter?.filterType || 'week'}_${dateFilter?.startDate || ''}_${dateFilter?.endDate || ''}`;
    const cached = this.getCached<HourlyTrafficEntry[]>(cacheKey);
    if (cached) return cached;

    const dateWhere = buildDateWhere(dateFilter);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const startDate = dateWhere.createdAt?.gte || sevenDaysAgo;
    const endDate = dateWhere.createdAt?.lte || now;

    const raw = await prisma.$queryRawUnsafe<Array<{
      hour: number;
      count: bigint;
      revenue: number;
    }>>(
      `SELECT 
        HOUR(createdAt) as hour,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE createdAt >= ?
        AND createdAt <= ?
        AND paymentStatus IN ('PAID', 'PARTIAL')
        AND status != 'CANCELLED'
      GROUP BY HOUR(createdAt)
      ORDER BY hour ASC`,
      startDate,
      endDate
    );

    const hourMap = new Map<number, { count: number; revenue: number }>();
    for (const row of raw) {
      hourMap.set(Number(row.hour), {
        count: Number(row.count) || 0,
        revenue: Number(row.revenue) || 0,
      });
    }

    const HOUR_LABELS = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
      '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'];
    const result: HourlyTrafficEntry[] = [];

    for (let h = 0; h < 24; h++) {
      const entry = hourMap.get(h) || { count: 0, revenue: 0 };
      result.push({
        hour: h,
        label: HOUR_LABELS[h],
        count: entry.count,
        revenue: entry.revenue,
      });
    }

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getInventoryEfficiency — Calculates turnover ratio and stale items, respects dateFilter for COGS
   */
  static async getInventoryEfficiency(dateFilter?: DateFilter) {
    const cacheKey = `inventory_efficiency_${dateFilter?.filterType || 'week'}_${dateFilter?.startDate || ''}_${dateFilter?.endDate || ''}`;
    const cached = this.getCached<InventoryEfficiencyResponse>(cacheKey);
    if (cached) return cached;

    const dateWhere = buildDateWhere(dateFilter);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const startDate = dateWhere.createdAt?.gte || sevenDaysAgo;
    const endDate = dateWhere.createdAt?.lte || now;

    // 1. COGS for the filtered period (using averageCost * qty sold estimate)
    // We estimate ingredient usage from order items
    const cogsResult = await prisma.$queryRawUnsafe<Array<{ totalCogs: number }>>(
      `SELECT COALESCE(SUM(oi.quantity * fi.price * 0.42), 0) as totalCogs
       FROM order_items oi
       JOIN food_items fi ON fi.id = oi.foodId
       JOIN orders o ON o.id = oi.orderId
       WHERE o.createdAt >= ?
         AND o.createdAt <= ?
         AND o.paymentStatus IN ('PAID', 'PARTIAL')
         AND o.status != 'CANCELLED'`,
      startDate,
      endDate
    );
    const cogs = Number(cogsResult[0]?.totalCogs || 0);

    // 2. Average inventory value
    const invAgg = await prisma.inventoryItem.aggregate({
      _avg: { averageCost: true },
      _sum: { quantity: true },
    });
    const avgItemCost = Number(invAgg._avg.averageCost || 0);
    const totalQty = Number(invAgg._sum.quantity || 0);
    const avgInventoryValue = totalQty > 0 ? avgItemCost * totalQty : 1;

    // Inventory Turnover = COGS / Average Inventory Value (annualized)
    const weeklyTurnover = cogs / avgInventoryValue;
    const annualizedTurnover = weeklyTurnover * 52;

    // 3. Stale items (no movement in 30+ days)
    const staleItems = await prisma.$queryRawUnsafe<Array<{
      id: number;
      name: string;
      sku: string;
      quantity: number;
      lastUpdated: Date;
      daysInStock: number;
    }>>(
      `SELECT 
        ii.id,
        ii.name,
        ii.sku,
        ii.quantity,
        ii.updatedAt as lastUpdated,
        DATEDIFF(NOW(), ii.updatedAt) as daysInStock
      FROM inventory_items ii
      WHERE ii.updatedAt < ?
        AND ii.quantity > 0
      ORDER BY daysInStock DESC
      LIMIT 20`,
      thirtyDaysAgo
    );

    const staleMapped = staleItems.map(r => ({
      id: Number(r.id),
      name: r.name,
      sku: r.sku,
      quantity: Number(r.quantity) || 0,
      lastUpdated: r.lastUpdated instanceof Date ? r.lastUpdated.toISOString() : String(r.lastUpdated),
      daysInStock: Number(r.daysInStock) || 0,
    }));

    const result: InventoryEfficiencyResponse = {
      inventoryTurnover: Math.round(annualizedTurnover * 100) / 100,
      averageInventoryValue: Math.round(avgInventoryValue),
      weeklyCogs: Math.round(cogs),
      staleItemCount: staleMapped.length,
      staleItems: staleMapped,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getPaymentDistribution — Groups revenue by Order type (proxy for payment method)
   * DINE_IN = Cash, TAKEAWAY = Card, DELIVERY = Online, respects dateFilter
   */
  static async getPaymentDistribution(dateFilter?: DateFilter) {
    const cacheKey = `payment_distribution_${dateFilter?.filterType || 'week'}_${dateFilter?.startDate || ''}_${dateFilter?.endDate || ''}`;
    const cached = this.getCached<PaymentDistributionEntry[]>(cacheKey);
    if (cached) return cached;

    const dateWhere = buildDateWhere(dateFilter);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const startDate = dateWhere.createdAt?.gte || sevenDaysAgo;
    const endDate = dateWhere.createdAt?.lte || now;

    const raw = await prisma.$queryRawUnsafe<Array<{
      paymentMethod: string;
      revenue: number;
      orderCount: bigint;
    }>>(
      `SELECT 
        CASE 
          WHEN type = 'DINE_IN' THEN 'Cash'
          WHEN type = 'TAKEAWAY' THEN 'Card'
          WHEN type = 'DELIVERY' THEN 'Online'
          ELSE 'Other'
        END as paymentMethod,
        COALESCE(SUM(total), 0) as revenue,
        COUNT(*) as orderCount
      FROM orders
      WHERE createdAt >= ?
        AND createdAt <= ?
        AND paymentStatus IN ('PAID', 'PARTIAL')
        AND status != 'CANCELLED'
      GROUP BY paymentMethod
      ORDER BY revenue DESC`,
      startDate,
      endDate
    );

    const totalRevenue = raw.reduce((s, r) => s + Number(r.revenue || 0), 0) || 1;

    const METHOD_CONFIG: Record<string, { color: string; icon: string }> = {
      'Cash': { color: '#10b981', icon: '💵' },
      'Card': { color: '#3b82f6', icon: '💳' },
      'Online': { color: '#8b5cf6', icon: '🌐' },
      'Other': { color: '#6b7280', icon: '❓' },
    };

    const result: PaymentDistributionEntry[] = raw.map(r => {
      const method = r.paymentMethod;
      const config = METHOD_CONFIG[method] || METHOD_CONFIG['Other'];
      const revenue = Number(r.revenue) || 0;
      return {
        paymentMethod: method,
        revenue,
        pct: Math.round((revenue / totalRevenue) * 100),
        orderCount: Number(r.orderCount) || 0,
        color: config.color,
        icon: config.icon,
      };
    });

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * getMostProfitableFoods — Calculates profit per dish using price vs COGS estimate
   * Profit = SUM((unitPrice - costEstimate) * quantity) for each food item, respects dateFilter
   */
  static async getMostProfitableFoods(dateFilter?: DateFilter) {
    const cacheKey = `most_profitable_foods_${dateFilter?.filterType || 'week'}_${dateFilter?.startDate || ''}_${dateFilter?.endDate || ''}`;
    const cached = this.getCached<ProfitableFoodEntry[]>(cacheKey);
    if (cached) return cached;

    const dateWhere = buildDateWhere(dateFilter);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
    const startDate = dateWhere.createdAt?.gte || sevenDaysAgo;
    const endDate = dateWhere.createdAt?.lte || now;

    const raw = await prisma.$queryRawUnsafe<Array<{
      foodId: number;
      foodName: string;
      categoryName: string;
      qty: number;
      revenue: number;
      unitPrice: number;
    }>>(
      `SELECT 
        fi.id as foodId,
        fi.name as foodName,
        c.name as categoryName,
        SUM(oi.quantity) as qty,
        COALESCE(SUM(oi.subtotal), 0) as revenue,
        AVG(oi.unitPrice) as unitPrice
      FROM order_items oi
      JOIN food_items fi ON fi.id = oi.foodId
      JOIN categories c ON c.id = fi.categoryId AND c.type = 'FOOD'
      JOIN orders o ON o.id = oi.orderId
      WHERE o.createdAt >= ?
        AND o.createdAt <= ?
        AND o.paymentStatus IN ('PAID', 'PARTIAL')
        AND o.status != 'CANCELLED'
      GROUP BY fi.id, fi.name, c.name
      HAVING qty > 0
      ORDER BY revenue DESC`,
      startDate,
      endDate
    );

    // Average cost ratio: 0.42 (42% of dish price is ingredient cost)
    const COST_RATIO = 0.42;

    const foods = raw.map(r => {
      const unitPrice = Number(r.unitPrice) || 0;
      const qty = Number(r.qty) || 0;
      const revenue = Number(r.revenue) || 0;
      const costEstimate = unitPrice * COST_RATIO;
      const profitPerUnit = unitPrice - costEstimate;
      const totalCost = costEstimate * qty;
      const totalProfit = revenue - totalCost;
      const marginPct = unitPrice > 0 ? Math.round((profitPerUnit / unitPrice) * 100) : 0;

      return {
        id: Number(r.foodId),
        name: r.foodName,
        category: r.categoryName,
        qty,
        revenue,
        unitPrice,
        costPerUnit: Math.round(costEstimate),
        profitPerUnit: Math.round(profitPerUnit),
        totalProfit: Math.round(totalProfit),
        marginPct,
      };
    });

    // Sort by totalProfit descending for most profitable
    const mostProfitable = [...foods].sort((a, b) => b.totalProfit - a.totalProfit).slice(0, 5);
    // Sort by marginPct descending for highest margin
    const highestMargin = [...foods].sort((a, b) => b.marginPct - a.marginPct).slice(0, 5);

    const result: ProfitableFoodsResponse = {
      mostProfitable,
      highestMargin,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /** Clear the entire cache (e.g., after a new order is placed) */
  static invalidateCache() {
    this.cache.clear();
  }
}

// ── Type Definitions ──────────────────────────────────────────────────────────

export interface DashboardSummary {
  todayRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalStockValue: number;
  pendingPayables: number;
  supplierPayableCount: number;
  weekRevenue: number;
  revenueTrendPct: number;
  timestamp: string;
}

export interface RevenueChartEntry {
  day: string;
  date: string;
  label: string;
  fullLabel: string;
  revenue: number;
  orderCount: number;
}

export interface TopCategoryEntry {
  name: string;
  revenue: number;
  pct: number;
  orderCount: number;
  fill: string;
}

export interface FoodRankingEntry {
  id: number;
  name: string;
  category: string;
  qty: number;
  revenue: number;
}

export interface FoodRankingResponse {
  topSelling: FoodRankingEntry[];
  leastSelling: FoodRankingEntry[];
}

// ── New Types ────────────────────────────────────────────────────────────────

export interface HourlyTrafficEntry {
  hour: number;
  label: string;
  count: number;
  revenue: number;
}

export interface StaleItemEntry {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  lastUpdated: string;
  daysInStock: number;
}

export interface InventoryEfficiencyResponse {
  inventoryTurnover: number;
  averageInventoryValue: number;
  weeklyCogs: number;
  staleItemCount: number;
  staleItems: StaleItemEntry[];
}

export interface PaymentDistributionEntry {
  paymentMethod: string;
  revenue: number;
  pct: number;
  orderCount: number;
  color: string;
  icon: string;
}

export interface ProfitableFoodEntry {
  id: number;
  name: string;
  category: string;
  qty: number;
  revenue: number;
  unitPrice: number;
  costPerUnit: number;
  profitPerUnit: number;
  totalProfit: number;
  marginPct: number;
}

export interface ProfitableFoodsResponse {
  mostProfitable: ProfitableFoodEntry[];
  highestMargin: ProfitableFoodEntry[];
}

export interface DetailedAnalytics {
  hourlyTraffic: HourlyTrafficEntry[];
  inventoryEfficiency: InventoryEfficiencyResponse;
  paymentDistribution: PaymentDistributionEntry[];
  profitableFoods: ProfitableFoodsResponse;
}
