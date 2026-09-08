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
  total?: number;
  amountPaid?: number;
  customerName?: string;
  customerId?: number;
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

    // 🌟 Broadcast to Live Orders Kanban & Invoices page via SSE
    try {
      broadcastToRoom('default-tenant:SHOP', 'invoice_finalized', formattedOrder);
    } catch (err) {
      console.warn('[SSE Broadcast Error]:', err);
    }

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
      return tx.order.update({
        where: { id },
        data: {
          type: data.orderType as any,
          paymentStatus: finalPaymentStatus,
          subtotal: data.subtotal,
          discount: data.discount || 0,
          total: grandTotal,
          amountPaid: parsedAmountPaid,
          customerId: data.customerId || null,
          notes: JSON.stringify({ customerName: data.customerName }),
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