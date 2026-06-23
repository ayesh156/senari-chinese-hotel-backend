import prisma from '../lib/prisma';
import { getIO } from '../lib/socket';

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
          notes: JSON.stringify({ customerName: data.customerName }),
          items: {
            create: data.items.map((item) => ({
              foodId: item.foodId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: Number(item.unitPrice) * Number(item.quantity),
            })),
          },
        },
        include: { items: { include: { food: true } } },
      });
      return created;
    });

    // Broadcast to Live Orders Kanban + Invoices page
    try { getIO().emit('newOrder', order); } catch {}
    try { getIO().emit('invoiceCreated', order); } catch {}

    console.log(`[DB] POST /orders → #${order.id} (${order.invoiceNumber}) status=${order.status} payment=${finalPaymentStatus}`);
    return order;
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

    // Broadcast update event
    try { getIO().emit('invoiceUpdated', updated); } catch {}

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

    try { getIO().emit('orderStatusChanged', updated); } catch {}

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