import prisma from '../lib/prisma';

interface CreatePOItemInput {
  inventoryItemId: number;
  quantity: number;
  unitPrice: number;
}

interface CreatePOInput {
  supplierId: number;
  notes?: string;
  receivedAt?: string;
  amountPaid?: number;
  items: CreatePOItemInput[];
}

interface UpdatePOInput {
  supplierId: number;
  notes?: string;
  receivedAt?: string;
  items: CreatePOItemInput[];
  additionalPayment?: number;
}

interface SettlePOInput {
  amount: number;
  paymentMethod?: string;
  notes?: string;
}

export class PurchaseOrderService {
  static async getAll() {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true, unit: { select: { name: true, abbreviation: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders;
  }

  static async getById(id: number) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true, unit: { select: { name: true, abbreviation: true } } } },
          },
        },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) {
      throw Object.assign(new Error('Purchase order not found'), { statusCode: 404 });
    }
    return order;
  }

  static async create(data: CreatePOInput) {
    if (!data.supplierId || !data.items || data.items.length === 0) {
      throw Object.assign(new Error('Supplier and at least one item are required'), { statusCode: 400 });
    }

    return prisma.$transaction(async (tx) => {
      // 1. Auto-generate PO number: find latest, increment, pad to 5 digits
      const lastPO = await tx.purchaseOrder.findFirst({
        orderBy: { poNumber: 'desc' },
        select: { poNumber: true },
      });
      let nextSeq = 1;
      if (lastPO) {
        // Strip 'PO' prefix and any leading dash/hyphen, then parse number
        const cleaned = lastPO.poNumber.replace(/^PO-?/i, '');
        const numPart = parseInt(cleaned, 10);
        if (!isNaN(numPart)) nextSeq = numPart + 1;
      }
      const poNumber = `PO${String(nextSeq).padStart(5, '0')}`;

      // 2. Calculate total from items
      let totalAmount = 0;
      const itemPromises = data.items.map(async (item) => {
        const subTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
        totalAmount += subTotal;

        // 3. Increment inventory stock
        const invItem = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
        if (!invItem) {
          throw Object.assign(new Error(`Inventory item id=${item.inventoryItemId} not found`), { statusCode: 404 });
        }
        const newQty = Number(invItem.quantity) + item.quantity;
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: newQty },
        });

        return { inventoryItemId: item.inventoryItemId, quantity: item.quantity, unitPrice: item.unitPrice, subTotal };
      });

      const resolvedItems = await Promise.all(itemPromises);

      // 4. Calculate amountPaid and paymentStatus
      const paymentAmount = data.amountPaid && data.amountPaid > 0 ? Math.round(data.amountPaid * 100) / 100 : 0;
      let paymentStatus: string = 'UNPAID';
      if (paymentAmount >= totalAmount) paymentStatus = 'PAID';
      else if (paymentAmount > 0) paymentStatus = 'PARTIAL';

      // 5. Create the PurchaseOrder with items
      const order = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId: data.supplierId,
          totalAmount: Math.round(totalAmount * 100) / 100,
          amountPaid: paymentAmount,
          paymentStatus: paymentStatus as any,
          notes: data.notes || null,
          receivedAt: data.receivedAt ? new Date(data.receivedAt) : null,
          items: {
            create: resolvedItems,
          },
        },
        include: {
          supplier: { select: { id: true, name: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, name: true, sku: true, unit: { select: { name: true, abbreviation: true } } } },
            },
          },
        },
      });

      // 6. If payment > 0, create SupplierPayment ledger record
      if (paymentAmount > 0) {
        await tx.supplierPayment.create({
          data: {
            supplierId: data.supplierId,
            purchaseOrderId: order.id,
            amountPaid: paymentAmount,
            paymentMethod: 'Cash',
            notes: `Initial payment for ${poNumber}`,
          },
        });
      }

      // 7. Update supplier aggregate totals
      const agg = await tx.purchaseOrder.aggregate({
        where: { supplierId: data.supplierId },
        _sum: { totalAmount: true, amountPaid: true },
      });
      const tp = Number(agg._sum.totalAmount || 0);
      const ap = Number(agg._sum.amountPaid || 0);
      await tx.supplier.update({
        where: { id: data.supplierId },
        data: { totalPurchases: tp, payableAmount: Math.max(0, tp - ap) },
      });

      console.log(`[DB] POST /purchase-orders → created "${order.poNumber}" (supplier=${data.supplierId}) total=${order.totalAmount} paid=${paymentAmount} status=${paymentStatus}`);
      return order;
    });
  }

  static async update(id: number, data: UpdatePOInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch existing PO with its items
      const existing = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!existing) {
        throw Object.assign(new Error('Purchase order not found'), { statusCode: 404 });
      }

      // 2. Revert old stock: DECREMENT for each old item
      for (const oldItem of existing.items) {
        const invItem = await tx.inventoryItem.findUnique({ where: { id: oldItem.inventoryItemId } });
        if (invItem) {
          const revertedQty = Math.max(0, Number(invItem.quantity) - Number(oldItem.quantity));
          await tx.inventoryItem.update({
            where: { id: oldItem.inventoryItemId },
            data: { quantity: revertedQty },
          });
        }
      }

      // 3. Delete old purchase order items
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

      // 4. Calculate new total from updated items and create items + INCREMENT stock
      let newTotalAmount = 0;
      const newItemPromises = data.items.map(async (item) => {
        const subTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
        newTotalAmount += subTotal;

        const invItem = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
        if (!invItem) {
          throw Object.assign(new Error(`Inventory item id=${item.inventoryItemId} not found`), { statusCode: 404 });
        }
        const newQty = Number(invItem.quantity) + item.quantity;
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: newQty },
        });

        return { inventoryItemId: item.inventoryItemId, quantity: item.quantity, unitPrice: item.unitPrice, subTotal };
      });

      const newResolvedItems = await Promise.all(newItemPromises);

      // 5. Financial math: preserve existing paid amount, add additional payment if any
      const existingPaid = Number(existing.amountPaid);
      const additionalPayment = data.additionalPayment && data.additionalPayment > 0 ? Math.round(data.additionalPayment * 100) / 100 : 0;
      const newAmountPaid = existingPaid + additionalPayment;

      let newPaymentStatus: string;
      if (newAmountPaid >= newTotalAmount) newPaymentStatus = 'PAID';
      else if (newAmountPaid > 0) newPaymentStatus = 'PARTIAL';
      else newPaymentStatus = 'UNPAID';

      // 6. Update the purchase order record with new financials
      const order = await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          totalAmount: Math.round(newTotalAmount * 100) / 100,
          amountPaid: Math.round(newAmountPaid * 100) / 100,
          paymentStatus: newPaymentStatus as any,
          notes: data.notes || null,
          receivedAt: data.receivedAt ? new Date(data.receivedAt) : null,
          items: {
            create: newResolvedItems,
          },
        },
        include: {
          supplier: { select: { id: true, name: true } },
          items: {
            include: {
              inventoryItem: { select: { id: true, name: true, sku: true, unit: { select: { name: true, abbreviation: true } } } },
            },
          },
        },
      });

      // 7. If additionalPayment > 0, create SupplierPayment ledger record
      if (additionalPayment > 0) {
        await tx.supplierPayment.create({
          data: {
            supplierId: data.supplierId,
            purchaseOrderId: id,
            amountPaid: additionalPayment,
            paymentMethod: 'Cash',
            notes: `Additional payment for ${existing.poNumber}`,
          },
        });
      }

      // 8. Update supplier aggregate totals
      const agg = await tx.purchaseOrder.aggregate({
        where: { supplierId: data.supplierId },
        _sum: { totalAmount: true, amountPaid: true },
      });
      const tp = Number(agg._sum.totalAmount || 0);
      const ap = Number(agg._sum.amountPaid || 0);
      await tx.supplier.update({
        where: { id: data.supplierId },
        data: { totalPurchases: tp, payableAmount: Math.max(0, tp - ap) },
      });

      console.log(`[DB] PUT /purchase-orders/${id} → updated "${order.poNumber}" total=${order.totalAmount} paid=${order.amountPaid} status=${newPaymentStatus}`);
      return order;
    });
  }

  static async delete(id: number) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch PO with items
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) {
        throw Object.assign(new Error('Purchase order not found'), { statusCode: 404 });
      }

      // 2. Reverse stock increments: decrement each inventory item
      for (const item of order.items) {
        const invItem = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
        if (invItem) {
          const newQty = Math.max(0, Number(invItem.quantity) - Number(item.quantity));
          await tx.inventoryItem.update({
            where: { id: item.inventoryItemId },
            data: { quantity: newQty },
          });
        }
      }

      // 3. Delete linked supplier payments for this PO
      await tx.supplierPayment.deleteMany({ where: { purchaseOrderId: id } });

      // 4. Delete items (cascaded via onDelete: Cascade) then PO
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      await tx.purchaseOrder.delete({ where: { id } });

      // 5. Recalculate supplier aggregates
      const agg = await tx.purchaseOrder.aggregate({
        where: { supplierId: order.supplierId },
        _sum: { totalAmount: true, amountPaid: true },
      });
      const tp = Number(agg._sum.totalAmount || 0);
      const ap = Number(agg._sum.amountPaid || 0);
      await tx.supplier.update({
        where: { id: order.supplierId },
        data: { totalPurchases: tp, payableAmount: Math.max(0, tp - ap) },
      });

      console.log(`[DB] DELETE /purchase-orders/${id} → deleted "${order.poNumber}"`);
      return null;
    });
  }

  static async settle(id: number, data: SettlePOInput) {
    if (!data.amount || data.amount <= 0) {
      throw Object.assign(new Error('A positive payment amount is required'), { statusCode: 400 });
    }

    return prisma.$transaction(async (tx) => {
      // 1. Fetch PO
      const order = await tx.purchaseOrder.findUnique({ where: { id } });
      if (!order) {
        throw Object.assign(new Error('Purchase order not found'), { statusCode: 404 });
      }
      if (order.paymentStatus === 'PAID') {
        throw Object.assign(new Error('Purchase order is already fully paid'), { statusCode: 400 });
      }

      // 2. Create SupplierPayment record linked to this PO
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId: order.supplierId,
          purchaseOrderId: id,
          amountPaid: data.amount,
          paymentMethod: data.paymentMethod || 'Cash',
          notes: data.notes || `Payment for ${order.poNumber}`,
        },
      });

      // 3. Increment amountPaid on PO
      const newAmountPaid = Number(order.amountPaid) + data.amount;
      const newPaymentStatus = newAmountPaid >= Number(order.totalAmount) ? 'PAID' : 'PARTIAL';

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          amountPaid: Math.round(newAmountPaid * 100) / 100,
          paymentStatus: newPaymentStatus as any,
        },
      });

      // 4. Update supplier aggregate totals
      const agg = await tx.purchaseOrder.aggregate({
        where: { supplierId: order.supplierId },
        _sum: { totalAmount: true, amountPaid: true },
      });
      const tp = Number(agg._sum.totalAmount || 0);
      const ap = Number(agg._sum.amountPaid || 0);
      await tx.supplier.update({
        where: { id: order.supplierId },
        data: { totalPurchases: tp, payableAmount: Math.max(0, tp - ap) },
      });

      console.log(`[DB] POST /purchase-orders/${id}/settle → payment=${data.amount} (${newPaymentStatus})`);
      return {
        payment,
        orderId: id,
        newAmountPaid,
        newPaymentStatus,
        remainingPayable: Math.max(0, Number(order.totalAmount) - newAmountPaid),
      };
    });
  }
}