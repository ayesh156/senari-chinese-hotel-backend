import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CreateCustomerInput { name: string; phone: string; email?: string; address?: string; nic?: string; image?: string; }
interface UpdateCustomerInput { name?: string; phone?: string; email?: string; address?: string; nic?: string; image?: string; }

export class CustomerService {
  static async getAll() {
    const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });

    const mapped = await Promise.all(customers.map(async (c) => {
      const [orderAgg, paymentCount] = await Promise.all([
        prisma.order.aggregate({
          where: { customerId: c.id },
          _count: { id: true },
          _sum: { amountPaid: true, total: true },
        }),
        prisma.paymentRecord.count({ where: { customerId: c.id } }),
      ]);

      return {
        id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address,
        nic: c.nic, image: c.image,
        dueAmount: Math.max(0, Number(orderAgg._sum.total || 0) - Number(orderAgg._sum.amountPaid || 0)),
        totalOrders: orderAgg._count.id,
        totalSpent: Number(orderAgg._sum.amountPaid || 0),
        paymentCount,
        reminderCount: c.reminderCount,
        createdAt: c.createdAt, updatedAt: c.updatedAt,
      };
    }));
    return mapped;
  }

  static async getById(id: number) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw Object.assign(new Error('Customer not found'), { statusCode: 404 });
    const [orderAgg, paymentCount] = await Promise.all([
      prisma.order.aggregate({ where: { customerId: id }, _count: { id: true }, _sum: { amountPaid: true, total: true } }),
      prisma.paymentRecord.count({ where: { customerId: id } }),
    ]);
    return {
      id: customer.id, name: customer.name, phone: customer.phone, email: customer.email,
      address: customer.address, nic: customer.nic, image: customer.image,
      dueAmount: Math.max(0, Number(orderAgg._sum.total || 0) - Number(orderAgg._sum.amountPaid || 0)),
      totalOrders: orderAgg._count.id,
      totalSpent: Number(orderAgg._sum.amountPaid || 0),
      paymentCount,
      reminderCount: customer.reminderCount,
      createdAt: customer.createdAt, updatedAt: customer.updatedAt,
    };
  }

  static async getPayments(customerId: number) { return prisma.paymentRecord.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } }); }
  static async getReminders(customerId: number) { return prisma.reminderHistory.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } }); }

  static async create(data: CreateCustomerInput) {
    if (!data.name || !data.phone) throw Object.assign(new Error('Name and phone are required'), { statusCode: 400 });
    const existing = await prisma.customer.findUnique({ where: { phone: data.phone } });
    if (existing) throw Object.assign(new Error('A customer with this phone number already exists'), { statusCode: 409 });
    const c = await prisma.customer.create({ data: { name: data.name, phone: data.phone, email: data.email || null, address: data.address || null, nic: data.nic || null, image: data.image || null } });
    return { id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, nic: c.nic, image: c.image, dueAmount: 0, totalOrders: 0, totalSpent: 0, paymentCount: 0, reminderCount: 0, createdAt: c.createdAt, updatedAt: c.updatedAt };
  }

  static async update(id: number, data: UpdateCustomerInput) {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.nic !== undefined) updateData.nic = data.nic || null;
    if (data.image !== undefined) updateData.image = data.image || null;
    if (data.phone !== undefined) {
      const existing = await prisma.customer.findUnique({ where: { phone: data.phone } });
      if (existing && existing.id !== id) throw Object.assign(new Error('A customer with this phone number already exists'), { statusCode: 409 });
    }
    if (data.image !== undefined && data.image) {
      const existingCustomer = await prisma.customer.findUnique({ where: { id }, select: { image: true } });
      if (existingCustomer?.image) { const oldPath = path.join(__dirname, '../../public', existingCustomer.image); if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch {} } }
    }
    await prisma.customer.update({ where: { id }, data: updateData });
    return this.getById(id);
  }

  static async delete(id: number) {
    const orderCount = await prisma.order.count({ where: { customerId: id } });
    if (orderCount > 0) throw Object.assign(new Error(`Cannot delete customer with ${orderCount} order(s).`), { statusCode: 409 });
    await prisma.customer.delete({ where: { id } });
    return null;
  }

  static async settleDue(customerId: number, amount: number) {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw Object.assign(new Error('Customer not found'), { statusCode: 404 });
      const unpaidInvoices = await tx.order.findMany({ where: { customerId, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } }, orderBy: { createdAt: 'asc' } });
      if (unpaidInvoices.length === 0) throw Object.assign(new Error('No outstanding invoices'), { statusCode: 400 });
      let remaining = amount;
      for (const invoice of unpaidInvoices) {
        if (remaining <= 0) break;
        const outstandingDue = Number(invoice.total) - Number(invoice.amountPaid);
        if (outstandingDue <= 0) continue;
        const paymentForThisInvoice = Math.min(remaining, outstandingDue);
        const newAmountPaid = Number(invoice.amountPaid) + paymentForThisInvoice;
        const newPaymentStatus = newAmountPaid >= Number(invoice.total) ? 'PAID' : 'PARTIAL';
        await tx.order.update({ where: { id: invoice.id }, data: { amountPaid: newAmountPaid, paymentStatus: newPaymentStatus as any } });
        remaining -= paymentForThisInvoice;
      }
      await tx.paymentRecord.create({ data: { customerId, amount, notes: `Settled Rs. ${amount.toLocaleString('en-LK')} against outstanding invoices` } });
      const orderAgg = await tx.order.aggregate({ where: { customerId }, _sum: { amountPaid: true, total: true } });
      const newDueAmount = Math.max(0, Number(orderAgg._sum.total || 0) - Number(orderAgg._sum.amountPaid || 0));
      await tx.customer.update({ where: { id: customerId }, data: { dueAmount: newDueAmount } });
      return { appliedAmount: amount - remaining, remainingDue: newDueAmount };
    });
  }

  static async sendReminder(customerId: number, message: string) {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw Object.assign(new Error('Customer not found'), { statusCode: 404 });
      await tx.reminderHistory.create({ data: { customerId, message: message || `Dear ${customer.name}, you have a pending due of Rs. ${Number(customer.dueAmount).toLocaleString('en-LK')} at Senari Chinese Hotel.`, status: 'sent' } });
      await tx.customer.update({ where: { id: customerId }, data: { reminderCount: { increment: 1 } } });
      return { success: true, reminderCount: customer.reminderCount + 1 };
    });
  }
}