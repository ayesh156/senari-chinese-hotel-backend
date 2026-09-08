import { TableStatus } from '@prisma/client';
import prisma from '../lib/prisma.ts';

interface CreateTableInput {
  tableNumber: string;
  capacity?: number;
  notes?: string;
}

interface UpdateStatusInput {
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  liveOrderId?: number;
  reservationNotes?: string;
}

export class TableService {
  static async getAll() {
    const tables = await prisma.restaurantTable.findMany({
      orderBy: { tableNumber: 'asc' },
      include: {
        orders: {
          where: {
            status: { in: ['PENDING', 'PREPARING', 'READY'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });

    return tables.map((table) => {
      const activeOrder = table.orders.length > 0 ? table.orders[0] : null;
      return {
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status,
        notes: table.notes,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        currentOrder: activeOrder
          ? {
              id: activeOrder.id,
              invoiceNumber: activeOrder.invoiceNumber,
              status: activeOrder.status,
              total: Number(activeOrder.total),
              createdAt: activeOrder.createdAt,
            }
          : null,
      };
    });
  }

  static async getById(id: number) {
    const table = await prisma.restaurantTable.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: { in: ['PENDING', 'PREPARING', 'READY'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });

    if (!table) {
      throw Object.assign(new Error('Table not found'), { statusCode: 404 });
    }

    const activeOrder = table.orders.length > 0 ? table.orders[0] : null;
    return {
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
      notes: table.notes,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      currentOrder: activeOrder
        ? {
            id: activeOrder.id,
            invoiceNumber: activeOrder.invoiceNumber,
            status: activeOrder.status,
            total: Number(activeOrder.total),
            createdAt: activeOrder.createdAt,
          }
        : null,
    };
  }

  static async create(data: CreateTableInput) {
    if (!data.tableNumber || !data.tableNumber.trim()) {
      throw Object.assign(new Error('Table number is required'), { statusCode: 400 });
    }

    // Normalize table number
    const normalizedNumber = data.tableNumber.trim().toUpperCase();

    // Check uniqueness
    const existing = await prisma.restaurantTable.findUnique({
      where: { tableNumber: normalizedNumber },
    });
    if (existing) {
      throw Object.assign(new Error(`Table "${normalizedNumber}" already exists`), { statusCode: 409 });
    }

    const table = await prisma.restaurantTable.create({
      data: {
        tableNumber: normalizedNumber,
        capacity: data.capacity ?? 4,
        notes: data.notes || null,
      },
    });

    console.log(`[DB] POST /tables → created table "${normalizedNumber}" id=${table.id}`);
    return table;
  }

  static async updateStatus(id: number, input: UpdateStatusInput) {
    const table = await prisma.restaurantTable.findUnique({ where: { id } });
    if (!table) {
      throw Object.assign(new Error('Table not found'), { statusCode: 404 });
    }

    const newStatus = input.status as TableStatus;

    // Validate transitions
    if (newStatus === 'OCCUPIED') {
      // liveOrderId is optional here — it's required when coming from order creation
      // but for manual admin status changes, we allow setting without it.
      if (input.liveOrderId) {
        // Verify the live order exists and belongs to this table
        const order = await prisma.order.findUnique({
          where: { id: input.liveOrderId },
        });
        if (!order) {
          throw Object.assign(new Error('Specified order does not exist'), { statusCode: 404 });
        }
        if (order.tableId !== id) {
          throw Object.assign(new Error('The specified order is not assigned to this table'), { statusCode: 400 });
        }
      }

      // Update the table status
      const updated = await prisma.restaurantTable.update({
        where: { id },
        data: { status: newStatus, notes: input.reservationNotes || table.notes },
      });
      console.log(`[DB] PATCH /tables/${id}/status → OCCUPIED${input.liveOrderId ? ` (order=${input.liveOrderId})` : ' (manual)'}`);
      return updated;
    }

    if (newStatus === 'AVAILABLE') {
      // Clear associated active orders by completing/cancelling them?
      // According to spec: clear the associated order/reservation.
      // We simply update the table status and clear the reservation notes if any.
      const updated = await prisma.restaurantTable.update({
        where: { id },
        data: {
          status: newStatus,
          notes: input.reservationNotes || null,
        },
      });
      console.log(`[DB] PATCH /tables/${id}/status → AVAILABLE`);
      return updated;
    }

    if (newStatus === 'RESERVED') {
      const updated = await prisma.restaurantTable.update({
        where: { id },
        data: {
          status: newStatus,
          notes: input.reservationNotes || table.notes,
        },
      });
      console.log(`[DB] PATCH /tables/${id}/status → RESERVED`);
      return updated;
    }

    throw Object.assign(new Error('Invalid status value'), { statusCode: 400 });
  }

  static async delete(id: number) {
    const table = await prisma.restaurantTable.findUnique({ where: { id } });
    if (!table) {
      throw Object.assign(new Error('Table not found'), { statusCode: 404 });
    }

    if (table.status === 'OCCUPIED') {
      throw Object.assign(
        new Error('Cannot delete a table that is currently OCCUPIED. Please clear the table first.'),
        { statusCode: 409 }
      );
    }

    await prisma.restaurantTable.delete({ where: { id } });
    console.log(`[DB] DELETE /tables/${id} → deleted table "${table.tableNumber}"`);
    return null;
  }
}