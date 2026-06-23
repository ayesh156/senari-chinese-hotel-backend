import prisma from '../lib/prisma';

interface CreateUnitInput {
  name: string;
  abbreviation: string;
}

interface UpdateUnitInput {
  name: string;
  abbreviation: string;
}

export class UnitService {
  static async getAll() {
    const units = await prisma.unit.findMany({
      orderBy: { name: 'asc' },
    });
    console.log(`[DB] GET /units → ${units.length} rows`);
    return units;
  }

  static async create(data: CreateUnitInput) {
    if (!data.name || !data.abbreviation) {
      throw Object.assign(new Error('Name and abbreviation are required'), { statusCode: 400 });
    }

    const existing = await prisma.unit.findUnique({ where: { name: data.name } });
    if (existing) {
      throw Object.assign(new Error('A unit with this name already exists'), { statusCode: 409 });
    }

    const unit = await prisma.unit.create({
      data: { name: data.name, abbreviation: data.abbreviation },
    });
    console.log(`[DB] POST /units → created "${data.name}" (${data.abbreviation}) id=${unit.id}`);
    return unit;
  }

  static async update(id: number, data: UpdateUnitInput) {
    if (!data.name) {
      throw Object.assign(new Error('Name is required'), { statusCode: 400 });
    }

    const existing = await prisma.unit.findUnique({ where: { name: data.name } });
    if (existing && existing.id !== id) {
      throw Object.assign(new Error('A unit with this name already exists'), { statusCode: 409 });
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: { name: data.name, abbreviation: data.abbreviation },
    });
    console.log(`[DB] PUT /units/${id} → updated`);
    return unit;
  }

  static async delete(id: number) {
    const inventoryCount = await prisma.inventoryItem.count({ where: { unitId: id } });
    if (inventoryCount > 0) {
      throw Object.assign(
        new Error(`Unit is referenced by ${inventoryCount} inventory item(s)`),
        { statusCode: 409 }
      );
    }

    await prisma.unit.delete({ where: { id } });
    console.log(`[DB] DELETE /units/${id} → deleted`);
    return null;
  }
}