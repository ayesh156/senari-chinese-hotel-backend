import prisma from '../lib/prisma';

interface CreateInventoryInput {
  sku?: string;
  name?: string;
  categoryId?: number;
  quantity?: number;
  unitId?: number;
  minAlertLevel?: number;
  unitPrice?: number;
}

interface UpdateInventoryInput {
  sku?: string;
  name?: string;
  categoryId?: number;
  quantity?: number;
  unitId?: number;
  minAlertLevel?: number;
  unitPrice?: number;
}

interface AdjustStockInput {
  newQuantity?: number;
  adjustmentType: string;
  notes?: string;
}

export class InventoryService {
  static async getAll() {
    const items = await prisma.inventoryItem.findMany({
      include: {
        category: true,
        unit: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[DB] GET /inventory → ${items.length} rows`);
    return items;
  }

  static async getById(id: number) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        category: true,
        unit: true,
      },
    });
    if (!item) {
      throw Object.assign(new Error('Inventory item not found'), { statusCode: 404 });
    }
    return item;
  }

  static async getHistory(id: number) {
    const records = await prisma.inventoryAdjustment.findMany({
      where: { inventoryItemId: id },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[DB] GET /inventory/${id}/history → ${records.length} entries`);
    return records;
  }

  static async create(data: CreateInventoryInput) {
    if (!data.sku || !data.name || !data.categoryId || !data.unitId || data.unitPrice === undefined) {
      throw Object.assign(new Error('SKU, name, category, unit, and unit price are required'), { statusCode: 400 });
    }

    const existing = await prisma.inventoryItem.findUnique({ where: { sku: data.sku } });
    if (existing) {
      throw Object.assign(new Error('An item with this SKU already exists'), { statusCode: 409 });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        sku: data.sku,
        name: data.name,
        categoryId: data.categoryId,
        quantity: data.quantity ?? 0,
        unitId: data.unitId,
        minAlertLevel: data.minAlertLevel ?? 0,
        unitPrice: data.unitPrice,
      },
      include: {
        category: true,
        unit: true,
      },
    });
    console.log(`[DB] POST /inventory → created "${item.name}" (${item.sku}) id=${item.id}`);
    return item;
  }

  static async update(id: number, data: UpdateInventoryInput) {
    const updateData: Record<string, any> = {};
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitId !== undefined) updateData.unitId = data.unitId;
    if (data.minAlertLevel !== undefined) updateData.minAlertLevel = data.minAlertLevel;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;

    if (data.sku !== undefined) {
      const existing = await prisma.inventoryItem.findUnique({ where: { sku: data.sku } });
      if (existing && existing.id !== id) {
        throw Object.assign(new Error('An item with this SKU already exists'), { statusCode: 409 });
      }
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        unit: true,
      },
    });
    console.log(`[DB] PUT /inventory/${id} → updated "${item.name}"`);
    return item;
  }

  /**
   * Atomically adjusts stock and creates a ledger entry in a transaction.
   * This is the ONLY method that should be used for stock adjustments.
   */
  static async adjustStock(id: number, data: AdjustStockInput) {
    if (data.newQuantity === undefined) {
      throw Object.assign(new Error('newQuantity is required'), { statusCode: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current item to get the previous stock
      const current = await tx.inventoryItem.findUnique({ where: { id } });
      if (!current) {
        throw Object.assign(new Error('Inventory item not found'), { statusCode: 404 });
      }

      const previousStock = Number(current.quantity);
      const newStock = data.newQuantity!;
      const qtyChange = newStock - previousStock;

      // 2. Update the item with the new quantity
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: { quantity: newStock },
        include: {
          category: true,
          unit: true,
        },
      });

      // 3. Create the inventory adjustment ledger record
      await tx.inventoryAdjustment.create({
        data: {
          inventoryItemId: id,
          adjustmentType: data.adjustmentType,
          quantity: qtyChange,
          previousStock,
          newStock,
          notes: data.notes || null,
        },
      });

      console.log(`[DB] ADJUST /inventory/${id}: ${previousStock} → ${newStock} (${qtyChange >= 0 ? '+' : ''}${qtyChange}) reason: ${data.adjustmentType}`);
      return updated;
    });

    return result;
  }

  static async delete(id: number) {
    const poCount = await prisma.purchaseOrderItem.count({ where: { inventoryItemId: id } });
    const adjCount = await prisma.inventoryAdjustment.count({ where: { inventoryItemId: id } });
    if (poCount > 0 || adjCount > 0) {
      throw Object.assign(
        new Error(`Item is referenced by ${poCount + adjCount} existing record(s)`),
        { statusCode: 409 }
      );
    }

    await prisma.inventoryItem.delete({ where: { id } });
    console.log(`[DB] DELETE /inventory/${id} → deleted`);
    return null;
  }
}