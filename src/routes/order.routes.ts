import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getIO } from '../lib/socket';

const router = Router();

// ── Generate a collision-proof 6-digit invoice number ──────────────────────
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

// GET /api/orders — fetch all orders with items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { food: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('[DB] GET /orders ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/live — active orders (not COMPLETED)
router.get('/live', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'COMPLETED' } },
      include: { items: { include: { food: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('[DB] GET /orders/live ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch live orders' });
  }
});

// GET /api/orders/:id — single order for editing
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { food: true } } },
    });
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('[DB] GET /orders/:id ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order' });
  }
});

// POST /api/orders — create order (dynamic payment status)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      orderType = 'DINE_IN',
      items = [],
      subtotal,
      discount = 0,
      total,
      amountPaid = 0,
      customerName,
    } = req.body;

    if (!items.length || subtotal === undefined || total === undefined) {
      res.status(400).json({ success: false, error: 'items, subtotal, and total are required' });
      return;
    }

    const invoiceNumber = await generateUniqueInvoiceNumber();
    const parsedAmountPaid = parseFloat(String(amountPaid)) || 0;
    const grandTotal = Number(total) || 0;
    const isPaidUpfront = parsedAmountPaid >= grandTotal - 0.01; // tolerance for float rounding
    const finalPaymentStatus = isPaidUpfront ? 'PAID' : (parsedAmountPaid > 0 ? 'PARTIAL' : 'UNPAID');

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          invoiceNumber,
          type: orderType,
          status: 'PENDING', // Always enter kitchen pipeline — food must be cooked
          paymentStatus: finalPaymentStatus,
          subtotal,
          discount,
          total: grandTotal,
          amountPaid: parsedAmountPaid,
          notes: JSON.stringify({ customerName }),
          items: {
            create: items.map((item: any) => ({
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
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('[Order API Error]:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id — update order (edit flow)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { orderType, items = [], subtotal, discount = 0, total, amountPaid = 0, customerName } = req.body;

    const parsedAmountPaid = parseFloat(String(amountPaid)) || 0;
    const grandTotal = Number(total) || 0;
    const isPaidUpfront = parsedAmountPaid >= grandTotal - 0.01;
    const finalPaymentStatus = isPaidUpfront ? 'PAID' : (parsedAmountPaid > 0 ? 'PARTIAL' : 'UNPAID');

    const updated = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      // Update order + recreate items (status stays PENDING for kitchen pipeline)
      return tx.order.update({
        where: { id },
        data: {
          type: orderType,
          status: 'PENDING',
          paymentStatus: finalPaymentStatus,
          subtotal,
          discount,
          total: grandTotal,
          amountPaid: parsedAmountPaid,
          notes: JSON.stringify({ customerName }),
          items: {
            create: items.map((item: any) => ({
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

    console.log(`[DB] PUT /orders/${id} → updated (${orderType}, ${items.length} items)`);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[DB] PUT /orders ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to update order' });
  }
});

// PUT /api/orders/:id/status — update order status with Socket.io
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { status } = req.body;
    const valid = ['PENDING', 'PREPARING', 'READY', 'COMPLETED'];
    if (!valid.includes(status)) {
      res.status(400).json({ success: false, error: `Invalid status` });
      return;
    }
    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { food: true } } },
    });
    try { getIO().emit('orderStatusChanged', updated); } catch {}
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[DB] PUT /orders/:id/status ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to update order status' });
  }
});

// DELETE /api/orders/:id — safe cascade
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: id } }),
      prisma.order.delete({ where: { id } }),
    ]);
    res.json({ success: true, data: null });
  } catch (error) {
    console.error('[DB] DELETE /orders ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to delete order' });
  }
});

export default router;