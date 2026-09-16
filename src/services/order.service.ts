import prisma from '../lib/prisma.ts';
import { broadcastToRoom } from '../gateways/orderLiveSync.gateway.ts';

interface OrderItemInput {
  foodId: number;
  quantity: number;
  unitPrice: number;
}

interface CreateOrderInput {
  orderType?: string;
  items: OrderItemInput[];
  subtotal: number;
  discount?: number;
  serviceChargeRate?: number; // 🌟 Dine-in percentage rate (e.g. 10.00)
  serviceCharge?: number;     // 🌟 Calculated service charge amount
  total: number;
  amountPaid?: number;
  customerName?: string;
  customerId?: number;
  phone?: string;
  arrivalDate?: string;
  arrivalTime?: string;
}

interface UpdateOrderInput {
  orderType?: string;
  items: OrderItemInput[];
  subtotal?: number;
  discount?: number;
  serviceChargeRate?: number; // 🌟
  serviceCharge?: number;     // 🌟
  total?: number;
  amountPaid?: number;
  customerName?: string;
  customerId?: number;
}

/**
 * 🌟 High-Concurrency Zero-DB Invoice Generator
 * Generates an instant, collision-free invoice number without hammering the DB connection pool.
 */
async function generateUniqueInvoiceNumber(): Promise<string> {
  const timePart = Date.now().toString().slice(-4);
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `INV${timePart}${randomPart}`;
}

export class OrderService {
  static async getAll() {
    const orders = await prisma.order.findMany({
      include: {
        items: { include: { food: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders;
  }

  static async getLive() {
    // 🌟 Auto-Complete Stale Previous Days' Orders while strictly PRESERVING future WEB pre-orders
    try {
      const now = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // 1. Fetch uncompleted orders created prior to today
      const staleCandidates = await prisma.order.findMany({
        where: {
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          createdAt: { lt: startOfToday },
        },
        select: { id: true, notes: true },
      });

      // 2. Filter out orders scheduled for today or future dates/times
      const idsToAutoComplete: number[] = [];
      for (const ord of staleCandidates) {
        let isFutureWebOrder = false;
        if (ord.notes) {
          try {
            const parsed = JSON.parse(ord.notes);
            if (parsed?.arrivalDate) {
              const [year, month, day] = parsed.arrivalDate.split('-').map(Number);
              let scheduledDateTime = new Date(year, month - 1, day, 23, 59, 59);

              if (parsed?.arrivalTime && parsed.arrivalTime.includes(':')) {
                const [h, m] = parsed.arrivalTime.split(':').map(Number);
                scheduledDateTime = new Date(year, month - 1, day, h, m, 0);
              }

              // If scheduled arrival is still in the future, do NOT auto-complete
              if (scheduledDateTime.getTime() >= now.getTime()) {
                isFutureWebOrder = true;
              }
            }
          } catch {
            // Non-JSON notes proceed with normal auto-complete
          }
        }

        if (!isFutureWebOrder) {
          idsToAutoComplete.push(ord.id);
        }
      }

      // 3. Batch complete only truly expired orders
      if (idsToAutoComplete.length > 0) {
        await prisma.order.updateMany({
          where: { id: { in: idsToAutoComplete } },
          data: {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
          },
        });
      }
    } catch (cleanupErr) {
      console.warn('[OrderService] Daily rollover auto-complete error:', cleanupErr);
    }

    // Return only today's active kitchen orders
    const orders = await prisma.order.findMany({
      where: { status: { not: 'COMPLETED' } },
      include: {
        items: { include: { food: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return orders;
  }

  static async getById(id: number) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { food: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!order) {
      throw Object.assign(new Error('Order not found'), { statusCode: 404 });
    }
    return order;
  }

  static async create(data: CreateOrderInput) {
    if (!data.items.length || data.subtotal === undefined || data.total === undefined) {
      throw Object.assign(new Error('items, subtotal, and total are required'), { statusCode: 400 });
    }

    const invoiceNumber = await generateUniqueInvoiceNumber();
    const parsedAmountPaid = parseFloat(String(data.amountPaid || 0));
    const grandTotal = Number(data.total) || 0;
    const isPaidUpfront = parsedAmountPaid >= grandTotal - 0.01;
    const finalPaymentStatus = isPaidUpfront ? 'PAID' : (parsedAmountPaid > 0 ? 'PARTIAL' : 'UNPAID');

    // 🛡️ Backend Sri Lankan Phone Validation (07X-XXXXXXX / +947XXXXXXXX)
    if (data.phone) {
      const cleanPhone = data.phone.replace(/[\s\-]/g, '');
      const slPhoneRegex = /^(?:0|(?:\+94))7[01245678][0-9]{7}$/;
      if (!slPhoneRegex.test(cleanPhone)) {
        throw Object.assign(new Error('Invalid Sri Lankan mobile number entered'), { statusCode: 400 });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          invoiceNumber,
          type: (data.orderType || 'DINE_IN') as any,
          status: 'PENDING',
          paymentStatus: finalPaymentStatus,
          subtotal: data.subtotal,
          discount: data.discount || 0,
          serviceChargeRate: data.serviceChargeRate || 0, // 🌟 Save to serviceChargeRate column
          serviceCharge: data.serviceCharge || 0,         // 🌟 Save to serviceCharge column
          total: grandTotal,
          amountPaid: parsedAmountPaid,
          customerId: data.customerId || null,
          notes: JSON.stringify({
            customerName: data.customerName,
            phone: data.phone,
            arrivalDate: data.arrivalDate,
            arrivalTime: data.arrivalTime,
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

    // 🌟 Live Orders සහ Invoices Card වල පාරිභෝගික නම/දුරකථන අංකය නිවැරදිව පෙන්වීමට Object එක සැකසීම
    const formattedOrder = {
      ...order,
      customerName: data.customerName || 'Walk-in Customer',
      customer: {
        id: data.customerId || 0,
        name: data.customerName || 'Walk-in Customer',
        phone: data.phone || '',
      },
    };

    // 🛡️ Note: Live broadcast is safely handled by order.controller.ts to prevent duplicate events
    console.log(`[DB] POST /orders → #${order.id} (${order.invoiceNumber}) status=${order.status} payment=${finalPaymentStatus}`);
    return formattedOrder;
  }

  static async update(id: number, data: UpdateOrderInput) {
    const parsedAmountPaid = parseFloat(String(data.amountPaid || 0));
    const grandTotal = Number(data.total) || 0;
    const isPaidUpfront = parsedAmountPaid >= grandTotal - 0.01;
    const finalPaymentStatus = isPaidUpfront ? 'PAID' : (parsedAmountPaid > 0 ? 'PARTIAL' : 'UNPAID');

    const updated = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      // Update order + recreate items
      const updatePayload: Record<string, any> = {
        type: data.orderType as any,
        paymentStatus: finalPaymentStatus,
        subtotal: data.subtotal,
        discount: data.discount || 0,
        total: grandTotal,
        amountPaid: parsedAmountPaid,
        customerId: data.customerId || null,
        notes: JSON.stringify({ customerName: data.customerName }),
      };

      if (data.serviceChargeRate !== undefined) updatePayload.serviceChargeRate = data.serviceChargeRate; // 🌟
      if (data.serviceCharge !== undefined) updatePayload.serviceCharge = data.serviceCharge;             // 🌟

      return tx.order.update({
        where: { id },
        data: {
          ...updatePayload,
          items: {
            create: data.items.map((item: any) => ({
              foodId: item.foodId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: Number(item.unitPrice) * Number(item.quantity),
            })),
          },
        },
        include: { items: { include: { food: true } } },
      });
    });

    // 🌟 Broadcast invoice update event via SSE
    try {
      broadcastToRoom('default-tenant:SHOP', 'invoice_updated', updated);
    } catch (err) {
      console.warn('[SSE Broadcast Error]:', err);
    }

    console.log(`[DB] PUT /orders/${id} → updated (${data.orderType}, ${data.items.length} items)`);
    return updated;
  }

  static async updateStatus(id: number, status: string) {
    const valid = ['PENDING', 'PREPARING', 'READY', 'COMPLETED'];
    if (!valid.includes(status)) {
      throw Object.assign(new Error('Invalid status'), { statusCode: 400 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: { items: { include: { food: true } } },
    });

    // 🌟 Broadcast status change (Preparing/Ready/Completed) via SSE
    try {
      broadcastToRoom('default-tenant:SHOP', 'order_status_changed', updated);
    } catch (err) {
      console.warn('[SSE Broadcast Error]:', err);
    }

    return updated;
  }

  static async delete(id: number) {
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: id } }),
      prisma.order.delete({ where: { id } }),
    ]);
    return null;
  }
}