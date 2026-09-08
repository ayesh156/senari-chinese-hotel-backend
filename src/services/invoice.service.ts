import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { broadcastToRoom } from '../gateways/orderLiveSync.gateway.js';

interface InvoiceFilter {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentStatus?: string;
  customerId?: number;
  page?: number;
  limit?: number;
}

interface CreateInvoiceInput {
  orderType?: string;
  items: Array<{ foodId: number; quantity: number; unitPrice: number }>;
  subtotal: number;
  discount?: number;
  total: number;
  amountPaid?: number;
  customerName?: string;
  customerId?: number;
  paymentMethod?: string;
}

async function generateUniqueInvoiceNumber(): Promise<string> {
  let isUnique = false;
  let newInvoiceNumber = '';
  while (!isUnique) {
    const random6 = Math.floor(100000 + Math.random() * 900000);
    newInvoiceNumber = `INV${random6}`;
    const existing = await prisma.order.findUnique({ where: { invoiceNumber: newInvoiceNumber } });
    if (!existing) isUnique = true;
  }
  return newInvoiceNumber;
}

export class InvoiceService {
  /**
   * Fetch invoices with search/filter, pagination, and include customer + items.
   */
  static async getAll(filters: InvoiceFilter = {}) {
    const {
      search,
      dateFrom,
      dateTo,
      paymentStatus,
      customerId,
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.OrderWhereInput = {};

    // Search by invoice number or customer name (via notes JSON)
    if (search) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { id: isNaN(Number(q)) ? undefined : Number(q) as any },
      ].filter(Boolean) as Prisma.OrderWhereInput[];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus as any;
    }

    // Customer filter
    if (customerId) {
      where.customerId = customerId;
    }

    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: { food: { select: { id: true, name: true, price: true } } },
          },
          customer: { select: { id: true, name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single invoice with full itemized list, tax/discount breakdown, customer info.
   */
  static async getById(id: number) {
    const invoice = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { food: { select: { id: true, name: true, price: true } } },
        },
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!invoice) {
      throw Object.assign(new Error('Invoice not found'), { statusCode: 404 });
    }

    // Compute tax & service charge breakdown (estimated from total)
    const subtotal = Number(invoice.subtotal);
    const discount = Number(invoice.discount);
    const total = Number(invoice.total);
    const afterDiscount = subtotal - discount;

    // Estimate: if total > afterDiscount, difference is tax+service
    const surcharge = Math.max(0, total - afterDiscount);
    // Assume 10% service charge on subtotal after discount, rest is tax
    const estimatedServiceCharge = Math.round(afterDiscount * 0.1);
    const estimatedTax = Math.max(0, surcharge - estimatedServiceCharge);

    return {
      ...invoice,
      breakdown: {
        subtotal,
        discount,
        afterDiscount,
        estimatedTax,
        estimatedServiceCharge,
        total,
        amountPaid: Number(invoice.amountPaid),
        balanceDue: Math.max(0, total - Number(invoice.amountPaid)),
      },
    };
  }

  /**
   * Create a manual invoice (not from an order).
   */
  static async create(data: CreateInvoiceInput) {
    if (!data.items.length || data.subtotal === undefined || data.total === undefined) {
      throw Object.assign(new Error('Items, subtotal, and total are required'), { statusCode: 400 });
    }

    const invoiceNumber = await generateUniqueInvoiceNumber();
    const parsedAmountPaid = parseFloat(String(data.amountPaid || 0));
    const grandTotal = Number(data.total) || 0;
    const isPaidUpfront = parsedAmountPaid >= grandTotal - 0.01;
    const finalPaymentStatus = isPaidUpfront ? 'PAID' : (parsedAmountPaid > 0 ? 'PARTIAL' : 'UNPAID');

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          invoiceNumber,
          type: (data.orderType || 'DINE_IN') as any,
          status: 'COMPLETED' as any,
          paymentStatus: finalPaymentStatus,
          subtotal: data.subtotal,
          discount: data.discount || 0,
          total: grandTotal,
          amountPaid: parsedAmountPaid,
          customerId: data.customerId || null,
          notes: JSON.stringify({
            customerName: data.customerName,
            paymentMethod: data.paymentMethod || 'Cash',
          }),
          items: {
            create: data.items.map((item) => ({
              foodId: item.foodId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: Number(item.unitPrice) * Number(item.quantity),
            })),
          },
        },
        include: {
          items: { include: { food: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      });
      return created;
    });

    // 🌟 Broadcast new manual invoice to connected clients via SSE
    try {
      broadcastToRoom('default-tenant:SHOP', 'invoice_finalized', invoice);
    } catch (err) {
      console.warn('[SSE Broadcast Error]:', err);
    }

    console.log(`[InvoiceService] Created invoice #${invoice.id} (${invoice.invoiceNumber})`);
    return invoice;
  }
}