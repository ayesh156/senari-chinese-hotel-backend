import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import prisma from '../lib/prisma';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../../public/uploads/foods');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getImageUrl(filename: string | undefined): string | null {
  if (!filename) return null;
  return `/uploads/foods/${filename}`;
}

interface CreateFoodInput {
  name?: string;
  price?: number;
  description?: string;
  categoryId?: number;
  isAvailable?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isHealthy?: boolean;
  prepTimeMinutes?: number;
  calories?: number;
  imageFilename?: string;
  imageUrl?: string;
  serves?: string;
  ingredients?: string[];
}

interface UpdateFoodInput {
  name?: string;
  price?: number;
  description?: string;
  categoryId?: number;
  isAvailable?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isHealthy?: boolean;
  prepTimeMinutes?: number;
  calories?: number;
  imageFilename?: string;
  imageUrl?: string;
  serves?: string;
  ingredients?: string[];
}

interface FoodQueryInput {
  maxPrice?: number;
  isHealthy?: boolean;
  isNew?: boolean;
  categoryId?: number;
  categorySlug?: string;
  search?: string;
}

export class FoodService {
  static async getAll(query?: FoodQueryInput) {
    const where: Record<string, any> = {};

    if (query?.maxPrice) {
      where.price = { lte: query.maxPrice };
    }
    if (query?.isHealthy !== undefined) {
      where.isHealthy = query.isHealthy;
    }
    if (query?.isNew !== undefined) {
      where.isNew = query.isNew;
    }
    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search } },
        { description: { contains: query.search } },
      ];
    }

    const foods = await prisma.foodItem.findMany({
      where,
      include: { category: true },
      orderBy: { sortOrder: 'asc' },
    });
    return foods;
  }

  static async getById(id: number) {
    try {
      const food = await prisma.foodItem.findUnique({
        where: { id },
        include: { category: true },
      });
      if (!food) {
        throw Object.assign(new Error('Food item not found'), { statusCode: 404 });
      }
      return food;
    } catch (error: any) {
      if (error.statusCode === 404) throw error;
      console.error(`[FoodService] getById(${id}) error:`, error);
      throw Object.assign(new Error('Failed to fetch food item'), { statusCode: 500 });
    }
  }

  static async create(data: CreateFoodInput) {
    if (!data.name || data.price === undefined || !data.categoryId) {
      throw Object.assign(new Error('Name, price, and categoryId are required'), { statusCode: 400 });
    }

    try {
      // Determine image: if imageUrl is provided (e.g. Unsplash URL), use it directly
      let imageValue: string | undefined | null = undefined;
      if (data.imageUrl) {
        imageValue = data.imageUrl;
      } else if (data.imageFilename) {
        imageValue = getImageUrl(data.imageFilename);
      }

      // Ensure ingredients is a clean array for Prisma Json field
      const safeIngredients = Array.isArray(data.ingredients) ? data.ingredients : [];

      const food = await prisma.foodItem.create({
        data: {
          name: data.name,
          price: data.price,
          description: data.description,
          categoryId: data.categoryId,
          isAvailable: data.isAvailable ?? true,
          isNew: data.isNew ?? false,
          isFeatured: data.isFeatured ?? false,
          isHealthy: data.isHealthy ?? false,
          prepTimeMinutes: data.prepTimeMinutes ?? 15,
          calories: data.calories ?? 450,
          serves: data.serves ?? "1-2 persons",
          ingredients: safeIngredients,
          image: imageValue ?? null,
        },
        include: { category: true },
      });
      return food;
    } catch (error: any) {
      console.error('[FoodService] create error:', error);
      throw Object.assign(new Error('Failed to create food item'), { statusCode: 500 });
    }
  }

  static async update(id: number, data: UpdateFoodInput) {
    try {
      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
      if (data.isNew !== undefined) updateData.isNew = data.isNew;
      if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured;
      if (data.isHealthy !== undefined) updateData.isHealthy = data.isHealthy;
      if (data.prepTimeMinutes !== undefined) updateData.prepTimeMinutes = data.prepTimeMinutes;
      if (data.calories !== undefined) updateData.calories = data.calories;
      if (data.serves !== undefined) updateData.serves = data.serves;
      if (data.ingredients !== undefined) {
        // Ensure ingredients is a clean array for Prisma Json field
        updateData.ingredients = Array.isArray(data.ingredients) ? data.ingredients : [];
      }

      // Handle image: imageUrl takes priority over imageFilename
      if (data.imageUrl !== undefined) {
        updateData.image = data.imageUrl;
      } else if (data.imageFilename !== undefined) {
        updateData.image = getImageUrl(data.imageFilename);
      }

      const food = await prisma.foodItem.update({
        where: { id },
        data: updateData,
        include: { category: true },
      });
      return food;
    } catch (error: any) {
      console.error(`[FoodService] update(${id}) error:`, error);
      if (error.code === 'P2025') {
        throw Object.assign(new Error('Food item not found'), { statusCode: 404 });
      }
      throw Object.assign(new Error('Failed to update food item'), { statusCode: 500 });
    }
  }

  static async delete(id: number) {
    // Optionally delete the image file from disk
    const existing = await prisma.foodItem.findUnique({ where: { id } });
    if (existing?.image && !existing.image.startsWith('http')) {
      const filename = path.basename(existing.image);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[FS] Deleted image: ${filePath}`);
      }
    }

    await prisma.foodItem.delete({ where: { id } });
    return null;
  }

  static async getPopularFoods(limit = 8) {
    try {
      // Compute start of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      // Aggregate OrderItems from COMPLETED/PAID orders this month
      const salesAgg = await prisma.orderItem.groupBy({
        by: ['foodId'],
        where: {
          order: {
            createdAt: { gte: startOfMonth },
            OR: [
              { status: 'COMPLETED' },
              { paymentStatus: 'PAID' },
            ],
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: limit,
      });

      if (salesAgg.length >= 4) {
        const ids = salesAgg.map((s) => s.foodId);
        const foods = await prisma.foodItem.findMany({
          where: { id: { in: ids } },
          include: { category: true },
        });
        // Maintain the aggregated order
        const foodMap = new Map(foods.map((f) => [f.id, f]));
        return ids.map((id) => foodMap.get(id)).filter(Boolean);
      }

      // Fallback: if fewer than 4 items from sales data, return featured or new items
      const fallback = await prisma.foodItem.findMany({
        where: {
          OR: [{ isFeatured: true }, { isNew: true }],
          isAvailable: true,
        },
        include: { category: true },
        take: limit,
        orderBy: { sortOrder: 'asc' },
      });

      return fallback;
    } catch (error: any) {
      console.error('[FoodService] getPopularFoods error:', error);
      // Last resort fallback — return any available items
      const fallback = await prisma.foodItem.findMany({
        where: { isAvailable: true },
        include: { category: true },
        take: limit,
        orderBy: { sortOrder: 'asc' },
      });
      return fallback;
    }
  }
}