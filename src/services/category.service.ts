import { CategoryType } from '@prisma/client';
import prisma from '../lib/prisma';

interface CreateCategoryInput {
  name: string;
  type: 'FOOD' | 'INVENTORY' | 'SUPPLIER';
}

interface UpdateCategoryInput {
  name: string;
}

export class CategoryService {
  static async getAll(type?: string) {
    const where = type ? { type: type as CategoryType } : {};
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
    if (!['FOOD', 'INVENTORY', 'SUPPLIER'].includes(data.type)) {
      throw Object.assign(new Error('Type must be FOOD, INVENTORY, or SUPPLIER'), { statusCode: 400 });
    }

    const existing = await prisma.category.findUnique({
      where: { name_type: { name: data.name, type: data.type } },
    });
    if (existing) {
      throw Object.assign(new Error(`A category "${data.name}" with type "${data.type}" already exists`), { statusCode: 409 });
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

    const target = await prisma.category.findUnique({ where: { id } });
    if (!target) {
      throw Object.assign(new Error('Category not found'), { statusCode: 404 });
    }

    const existing = await prisma.category.findUnique({
      where: { name_type: { name: data.name, type: target.type } },
    });
    if (existing && existing.id !== id) {
      throw Object.assign(new Error(`A category named "${data.name}" already exists in type "${target.type}"`), { statusCode: 409 });
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
