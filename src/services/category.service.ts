import prisma from '../lib/prisma';

interface CreateCategoryInput {
  name: string;
  type: 'FOOD' | 'INVENTORY';
}

interface UpdateCategoryInput {
  name: string;
}

export class CategoryService {
  static async getAll(type?: string) {
    const where = type ? { type: type as any } : {};
    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    console.log(`[DB] GET /categories?type=${type} → ${categories.length} rows`);
    return categories;
  }

  static async getById(id: number) {
    const category = await prisma.category.findUnique({ where: { id } });
    return category;
  }

  static async create(data: CreateCategoryInput) {
    if (!data.name || !data.type) {
      throw Object.assign(new Error('Name and type are required'), { statusCode: 400 });
    }
    if (!['FOOD', 'INVENTORY'].includes(data.type)) {
      throw Object.assign(new Error('Type must be FOOD or INVENTORY'), { statusCode: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing) {
      throw Object.assign(new Error('A category with this name already exists'), { statusCode: 409 });
    }

    const category = await prisma.category.create({
      data: { name: data.name, type: data.type },
    });
    console.log(`[DB] POST /categories → created "${data.name}" (${data.type}) id=${category.id}`);
    return category;
  }

  static async update(id: number, data: UpdateCategoryInput) {
    if (!data.name) {
      throw Object.assign(new Error('Name is required'), { statusCode: 400 });
    }

    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing && existing.id !== id) {
      throw Object.assign(new Error('A category with this name already exists'), { statusCode: 409 });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name: data.name },
    });
    console.log(`[DB] PUT /categories/${id} → renamed to "${data.name}"`);
    return category;
  }

  static async delete(id: number) {
    const foodCount = await prisma.foodItem.count({ where: { categoryId: id } });
    const inventoryCount = await prisma.inventoryItem.count({ where: { categoryId: id } });
    if (foodCount > 0 || inventoryCount > 0) {
      throw Object.assign(
        new Error(`Category is referenced by ${foodCount + inventoryCount} item(s)`),
        { statusCode: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });
    console.log(`[DB] DELETE /categories/${id} → deleted`);
    return null;
  }
}