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
  imageFilename?: string;
}

interface UpdateFoodInput {
  name?: string;
  price?: number;
  description?: string;
  categoryId?: number;
  isAvailable?: boolean;
  isNew?: boolean;
  imageFilename?: string;
}

export class FoodService {
  static async getAll() {
    const foods = await prisma.foodItem.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`[DB] GET /foods → ${foods.length} rows`);
    return foods;
  }

  static async getById(id: number) {
    const food = await prisma.foodItem.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!food) {
      throw Object.assign(new Error('Food item not found'), { statusCode: 404 });
    }
    console.log(`[DB] GET /foods/${id} → found "${food.name}"`);
    return food;
  }

  static async create(data: CreateFoodInput) {
    if (!data.name || data.price === undefined || !data.categoryId) {
      throw Object.assign(new Error('Name, price, and categoryId are required'), { statusCode: 400 });
    }

    const imagePath = data.imageFilename ? getImageUrl(data.imageFilename) : undefined;

    const food = await prisma.foodItem.create({
      data: {
        name: data.name,
        price: data.price,
        description: data.description,
        categoryId: data.categoryId,
        isAvailable: data.isAvailable ?? true,
        isNew: data.isNew ?? false,
        image: imagePath,
      },
      include: { category: true },
    });
    console.log(`[DB] POST /foods → created "${food.name}" id=${food.id} image=${imagePath || 'none'}`);
    return food;
  }

  static async update(id: number, data: UpdateFoodInput) {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
    if (data.isNew !== undefined) updateData.isNew = data.isNew;
    if (data.imageFilename !== undefined) {
      updateData.image = getImageUrl(data.imageFilename);
    }

    const food = await prisma.foodItem.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
    console.log(`[DB] PUT /foods/${id} → updated "${food.name}"`);
    return food;
  }

  static async delete(id: number) {
    // Optionally delete the image file from disk
    const existing = await prisma.foodItem.findUnique({ where: { id } });
    if (existing?.image) {
      const filename = path.basename(existing.image);
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[FS] Deleted image: ${filePath}`);
      }
    }

    await prisma.foodItem.delete({ where: { id } });
    console.log(`[DB] DELETE /foods/${id} → deleted`);
    return null;
  }
}