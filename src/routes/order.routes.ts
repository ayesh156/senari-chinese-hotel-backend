import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ── Generate a collision-proof 6-digit invoice number (INV + 6 digits) ────
async function generateUniqueInvoiceNumber(): Promise<string> {
  let isUnique = false;
  let newInvoiceNumber = '';

  while (!isUnique) {
    const random6 = Math.floor(100000 + Math.random() * 900000);
    newInvoiceNumber = `INV${random6}`;

    const existing = await prisma.order.findUnique({
      where: { invoiceNumber: newInvoiceNumber },
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return newInvoiceNumber;
}

// GET /api/orders — fetch all orders with items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: { include: { food: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[DB] GET /orders → ${orders.length} rows`);
    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('[DB] GET /orders ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// POST /api/orders — create order with items (Prisma transaction)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      orderType = 'DINE_IN',
      items = [],
      subtotal,
      discount = 0,
      total,
      paymentMethod = 'Cash',
      customerName,
    } = req.body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!items.length || subtotal === undefined || total === undefined) {
      res.status(400).json({ success: false, error: 'items, subtotal, and total are required' });
      return;
    }

    // ── Generate a unique 6-digit invoice number ──────────────────────────────
    const invoiceNumber = await generateUniqueInvoiceNumber();

    // ── Transaction: create Order + OrderItems atomically ───────────────────
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          invoiceNumber,
          type: orderType,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          subtotal,
          discount,
          total,
          notes: JSON.stringify({ paymentMethod, customerName }),
          items: {
            create: items.map((item: any) => ({
              foodId: item.foodId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: Number(item.unitPrice) * Number(item.quantity),
            })),
          },
        },
        include: {
          items: { include: { food: true } },
        },
      });
      return created;
    });

    console.log(`[DB] POST /orders → created order #${order.id} (${order.invoiceNumber}) with ${items.length} items`);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error('[Order API Error]:', error);
    if (error instanceof Error) {
      console.error('[Order API Error Details]:', error.message, error.stack);
    }
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// DELETE /api/orders/:id — delete order with items (safe cascade)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid order ID' });
      return;
    }

    // Transaction: delete child items first, then the order
    await prisma.$transaction([
      prisma.orderItem.deleteMany({ where: { orderId: id } }),
      prisma.order.delete({ where: { id } }),
    ]);

    console.log(`[DB] DELETE /orders/${id} → deleted`);
    res.json({ success: true, data: null });
  } catch (error) {
    console.error('[DB] DELETE /orders ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to delete order' });
  }
});

export default router;
