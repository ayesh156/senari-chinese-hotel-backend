import prisma from '../lib/prisma';

export class SupplierService {
  static async getAll() {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    return Promise.all(suppliers.map(async (s) => {
      const [poAgg, paymentCount, reminderCount] = await Promise.all([
        prisma.purchaseOrder.aggregate({ where: { supplierId: s.id }, _sum: { subtotal: true, paidAmount: true } }),
        prisma.supplierPayment.count({ where: { supplierId: s.id } }),
        prisma.supplierReminder.count({ where: { supplierId: s.id } }),
      ]);
      const totalPurchases = Number(poAgg._sum.subtotal || 0);
      const totalPaid = Number(poAgg._sum.paidAmount || 0);
      return {
        id: s.id, name: s.name, phone: s.phone, email: s.email, address: s.address, category: s.category,
        totalPurchases, payableAmount: Math.max(0, totalPurchases - totalPaid),
        paymentCount, reminderCount, createdAt: s.createdAt, updatedAt: s.updatedAt,
      };
    }));
  }

  static async getById(id: number) {
    const s = await prisma.supplier.findUnique({ where: { id } });
    if (!s) throw Object.assign(new Error('Supplier not found'), { statusCode: 404 });
    const [poAgg, paymentCount, reminderCount] = await Promise.all([
      prisma.purchaseOrder.aggregate({ where: { supplierId: id }, _sum: { subtotal: true, paidAmount: true } }),
      prisma.supplierPayment.count({ where: { supplierId: id } }),
      prisma.supplierReminder.count({ where: { supplierId: id } }),
    ]);
    const totalPurchases = Number(poAgg._sum.subtotal || 0);
    const totalPaid = Number(poAgg._sum.paidAmount || 0);
    return {
      id: s.id, name: s.name, phone: s.phone, email: s.email, address: s.address, category: s.category,
      totalPurchases, payableAmount: Math.max(0, totalPurchases - totalPaid),
      paymentCount, reminderCount, createdAt: s.createdAt, updatedAt: s.updatedAt,
    };
  }

  static async getPayments(supplierId: number) {
    return prisma.supplierPayment.findMany({ where: { supplierId }, orderBy: { createdAt: 'desc' } });
  }

  static async getReminders(supplierId: number) {
    return prisma.supplierReminder.findMany({ where: { supplierId }, orderBy: { createdAt: 'desc' } });
  }

  static async create(data: { name: string; phone?: string; email?: string; address?: string; category?: string }) {
    if (!data.name) throw Object.assign(new Error('Name is required'), { statusCode: 400 });
    return prisma.supplier.create({ data: { name: data.name, phone: data.phone || null, email: data.email || null, address: data.address || null, category: data.category || null } });
  }

  static async update(id: number, data: { name?: string; phone?: string; email?: string; address?: string; category?: string }) {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.category !== undefined) updateData.category = data.category || null;
    await prisma.supplier.update({ where: { id }, data: updateData });
    return this.getById(id);
  }

  static async delete(id: number) {
    const poCount = await prisma.purchaseOrder.count({ where: { supplierId: id } });
    if (poCount > 0) throw Object.assign(new Error(`Cannot delete supplier with ${poCount} purchase order(s)`), { statusCode: 409 });
    await prisma.supplier.delete({ where: { id } });
    return null;
  }

  static async settlePayable(supplierId: number, amount: number) {
    return prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw Object.assign(new Error('Supplier not found'), { statusCode: 404 });
      const unpaidPOs = await tx.purchaseOrder.findMany({
        where: { supplierId, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
        orderBy: { createdAt: 'asc' },
      });
      if (unpaidPOs.length === 0) throw Object.assign(new Error('No outstanding purchase orders'), { statusCode: 400 });
      let remaining = amount;
      for (const po of unpaidPOs) {
        if (remaining <= 0) break;
        const outstandingDue = Number(po.subtotal) - Number(po.paidAmount);
        if (outstandingDue <= 0) continue;
        const paymentForThisPO = Math.min(remaining, outstandingDue);
        const newPaidAmount = Number(po.paidAmount) + paymentForThisPO;
        const newPaymentStatus = newPaidAmount >= Number(po.subtotal) ? 'PAID' : 'PARTIAL';
        await tx.purchaseOrder.update({ where: { id: po.id }, data: { paidAmount: newPaidAmount, paymentStatus: newPaymentStatus as any } });
        remaining -= paymentForThisPO;
      }
      await tx.supplierPayment.create({ data: { supplierId, amountPaid: amount, notes: `Settled Rs. ${amount.toLocaleString('en-LK')} against outstanding POs` } });
      const poAgg = await tx.purchaseOrder.aggregate({ where: { supplierId }, _sum: { subtotal: true, paidAmount: true } });
      const newPayable = Math.max(0, Number(poAgg._sum.subtotal || 0) - Number(poAgg._sum.paidAmount || 0));
      await tx.supplier.update({ where: { id: supplierId }, data: { payableAmount: newPayable, totalPurchases: Number(poAgg._sum.subtotal || 0) } });
      return { appliedAmount: amount - remaining, remainingPayable: newPayable };
    });
  }

  static async sendReminder(supplierId: number, message: string) {
    return prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw Object.assign(new Error('Supplier not found'), { statusCode: 404 });
      await tx.supplierReminder.create({ data: { supplierId, message: message || `Dear ${supplier.name}, please review your outstanding payments with Senari Chinese Hotel.`, status: 'sent' } });
      return { success: true };
    });
  }
}