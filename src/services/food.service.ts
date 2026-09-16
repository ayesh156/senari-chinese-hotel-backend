import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import prisma from "../lib/prisma.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, "../../public/uploads/foods");

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
  code?: string | null; // 🌟 5-character short food code
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
  primaryImage?: string;
  imagesCatalog?: string[];
  serves?: string;
  ingredients?: string[];
}

interface UpdateFoodInput {
  name?: string;
  code?: string | null; // 🌟 5-character short food code
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
  primaryImage?: string;
  imagesCatalog?: string[];
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
  // 🌟 Format-Aware Incremental Code Generator: Preserves prefix and exact digit padding (e.g. 11 -> 12, 011 -> 012)
  static async getNextAvailableCodeFrom(currentCode?: string | null): Promise<string> {
    const allFoods = await prisma.foodItem.findMany({ select: { code: true } });
    const existingCodes = new Set(allFoods.map(f => f.code ? String(f.code).trim().toUpperCase() : '').filter(Boolean));

    if (currentCode && String(currentCode).trim()) {
      const trimmed = String(currentCode).trim().toUpperCase();
      // Match optional non-digit prefix and trailing numeric digits
      const match = trimmed.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1] || '';
        const digitsStr = match[2];
        const padding = digitsStr.length;
        let num = parseInt(digitsStr, 10);

        // Increment until an unused code is found
        for (let i = 0; i < 1000; i++) {
          num += 1;
          const candidate = `${prefix}${String(num).padStart(padding, '0')}`.slice(0, 5);
          if (!existingCodes.has(candidate)) {
            return candidate;
          }
        }
      }
    }

    // Default global fallback
    return FoodService.getNextCode();
  }

  // 🌟 Dynamic Adaptive Code Generator: Detects highest existing code's exact length and leading zero format
  static async getNextCode(): Promise<string> {
    const allFoods = await prisma.foodItem.findMany({
      select: { code: true },
      where: { code: { not: null } },
    });

    let maxNum = 0;
    let matchingPrefix = '';
    let matchedDigitsLength = 0;
    let hasLeadingZeros = false;

    for (const f of allFoods) {
      if (!f.code) continue;
      const trimmed = String(f.code).trim().toUpperCase();
      const match = trimmed.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1] || '';
        const digitsStr = match[2];
        const num = parseInt(digitsStr, 10);

        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
          matchingPrefix = prefix;
          matchedDigitsLength = digitsStr.length;
          // Check if user specifically padded this code with leading zeroes (e.g. "036", "011")
          hasLeadingZeros = digitsStr.length > 1 && digitsStr.startsWith('0');
        }
      }
    }

    const nextNum = maxNum + 1;

    // 🌟 If current highest code used leading zero (e.g. 036), preserve exact length (e.g. 037)
    // 🌟 If current code had no leading zero (e.g. 36 or 11), return clean increment (37 or 12)
    if (hasLeadingZeros && matchedDigitsLength > 0) {
      return `${matchingPrefix}${String(nextNum).padStart(matchedDigitsLength, '0')}`.slice(0, 5);
    }

    return `${matchingPrefix}${nextNum}`.slice(0, 5);
  }

  // 🌟 Enriched getAll: Injects live sales totals from OrderItem to match the Reports Tab
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

    // 1. Fetch matching food items and aggregate sold quantities across all completed orders
    const [foods, salesData] = await Promise.all([
      prisma.foodItem.findMany({
        where,
        include: { category: true },
      }),
      prisma.orderItem.groupBy({
        by: ['foodId'],
        _sum: { quantity: true },
      }),
    ]);

    // 2. Build fast in-memory map for sold quantities
    const salesMap = new Map<number, number>();
    salesData.forEach((s) => {
      salesMap.set(s.foodId, s._sum.quantity || 0);
    });

    // 3. Attach totalSold, salesCount, and orderCount to each food item
    const enrichedFoods = foods.map((f) => {
      const sold = salesMap.get(f.id) || 0;
      return {
        ...f,
        totalSold: sold,
        salesCount: sold,
        orderCount: sold,
      };
    });

    // 4. Default Sort: Pinned (Featured) first -> Highest Sales (Fast Moving) -> Natural Food Code -> ID
    return enrichedFoods.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;

      const soldDiff = (b.totalSold || 0) - (a.totalSold || 0);
      if (soldDiff !== 0) return soldDiff;

      if (a.code && b.code) {
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      }
      if (a.code) return -1;
      if (b.code) return 1;

      return b.id - a.id;
    });
  }

  static async getById(id: number) {
    try {
      const food = await prisma.foodItem.findUnique({
        where: { id },
        include: { category: true },
      });
      if (!food) {
        throw Object.assign(new Error("Food item not found"), {
          statusCode: 404,
        });
      }
      return food;
    } catch (error: any) {
      if (error.statusCode === 404) throw error;
      console.error(`[FoodService] getById(${id}) error:`, error);
      throw Object.assign(new Error("Failed to fetch food item"), {
        statusCode: 500,
      });
    }
  }

  static async create(data: CreateFoodInput) {
    if (!data.name || data.price === undefined || !data.categoryId) {
      throw Object.assign(
        new Error("Name, price, and categoryId are required"),
        { statusCode: 400 },
      );
    }

    try {
      // Determine image & catalog json
      const catalog = Array.isArray(data.imagesCatalog)
        ? data.imagesCatalog
        : [];
      let imageValue: string | null = data.primaryImage || catalog[0] || null;

      if (!imageValue && data.imageFilename) {
        imageValue = getImageUrl(data.imageFilename);
        if (imageValue && !catalog.includes(imageValue))
          catalog.push(imageValue);
      }

      // Ensure ingredients is a clean array for Prisma Json field
      const safeIngredients = Array.isArray(data.ingredients)
        ? data.ingredients
        : [];

      // 🌟 Clean and format food code
      const cleanCode = data.code ? String(data.code).trim().toUpperCase().slice(0, 5) : null;

      // 🌟 Prevent Duplicate Food Code with Meaningful Error Message & Next Available Code matching input format
      if (cleanCode) {
        const existingCode = await prisma.foodItem.findFirst({
          where: { code: cleanCode },
          select: { id: true, name: true, code: true },
        });
        if (existingCode) {
          const nextSuggestedCode = await FoodService.getNextAvailableCodeFrom(cleanCode);
          throw Object.assign(
            new Error(`Food code "${cleanCode}" is already in use by "${existingCode.name}". Next available code is "${nextSuggestedCode}".`),
            { statusCode: 400 }
          );
        }
      }

      const food = await prisma.foodItem.create({
        data: {
          name: data.name,
          code: cleanCode, // 🌟 Guarantees code is saved in database
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
          images: catalog,
        },
        include: { category: true },
      });
      return food;
    } catch (error: any) {
      console.error("[FoodService] create error:", error);
      // 🌟 Re-throw validation errors (like duplicate food codes) without overwriting them to 500
      if (error.statusCode) {
        throw error;
      }
      throw Object.assign(new Error("Failed to create food item"), {
        statusCode: 500,
      });
    }
  }

  static async update(id: number, data: UpdateFoodInput) {
    try {
      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      // 🌟 Ensure code is updated or cleared; ignores validation if code is unchanged for this item
      if (data.code !== undefined) {
        const cleanCode = data.code ? String(data.code).trim().toUpperCase().slice(0, 5) : null;
        const currentItem = await prisma.foodItem.findUnique({ where: { id: Number(id) }, select: { code: true } });

        // Only validate duplicates if the code is actually being changed to a different code
        if (cleanCode && cleanCode !== currentItem?.code) {
          const duplicate = await prisma.foodItem.findFirst({
            where: {
              code: cleanCode,
              id: { not: Number(id) }, // Strictly exclude current food item
            },
            select: { id: true, name: true, code: true },
          });
          if (duplicate) {
            const nextSuggestedCode = await FoodService.getNextAvailableCodeFrom(cleanCode);
            throw Object.assign(
              new Error(`Food code "${cleanCode}" is already in use by "${duplicate.name}". Next available code is "${nextSuggestedCode}".`),
              { statusCode: 400 }
            );
          }
        }
        updateData.code = cleanCode;
      }
      if (data.price !== undefined) updateData.price = data.price;
      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.categoryId !== undefined)
        updateData.categoryId = data.categoryId;
      if (data.isAvailable !== undefined)
        updateData.isAvailable = data.isAvailable;
      if (data.isNew !== undefined) updateData.isNew = data.isNew;
      if (data.isFeatured !== undefined)
        updateData.isFeatured = data.isFeatured;
      if (data.isHealthy !== undefined) updateData.isHealthy = data.isHealthy;
      if (data.prepTimeMinutes !== undefined)
        updateData.prepTimeMinutes = data.prepTimeMinutes;
      if (data.calories !== undefined) updateData.calories = data.calories;
      if (data.serves !== undefined) updateData.serves = data.serves;
      if (data.ingredients !== undefined) {
        // Ensure ingredients is a clean array for Prisma Json field
        updateData.ingredients = Array.isArray(data.ingredients)
          ? data.ingredients
          : [];
      }

      // 🌟 Safe Image Catalog Handling: Filter out falsy values, stringified "null", or duplicates
      if (data.imagesCatalog !== undefined) {
        const cleanCatalog = Array.isArray(data.imagesCatalog)
          ? data.imagesCatalog.filter((img) => img && img !== 'null' && img !== 'undefined')
          : [];
        if (cleanCatalog.length > 0) {
          updateData.images = cleanCatalog;
        }
      }

      // 🌟 Clean Primary Image detection
      const candidatePrimary = (data.primaryImage && data.primaryImage !== 'null' && data.primaryImage !== 'undefined')
        ? data.primaryImage
        : (data.imageFilename ? getImageUrl(data.imageFilename) : undefined);

      if (candidatePrimary !== undefined && candidatePrimary !== null) {
        // Check if previous image was a local file and safely remove it without breaking DB update
        try {
          const existing = await prisma.foodItem.findUnique({ where: { id } });
          if (existing?.image && !existing.image.startsWith('http') && existing.image !== candidatePrimary) {
            const oldFilename = path.basename(existing.image);
            const oldFilePath = path.join(UPLOADS_DIR, oldFilename);
            if (fs.existsSync(oldFilePath)) {
              fs.unlinkSync(oldFilePath);
              console.log(`[FS] Cleaned up replaced local image file: ${oldFilePath}`);
            }
          }
        } catch (fsErr) {
          // Non-blocking catch: Local disk cleanup failure should NEVER abort food update
          console.warn('[FS Warning] Safe cleanup ignored error:', fsErr);
        }

        updateData.image = candidatePrimary;
      }

      const food = await prisma.foodItem.update({
        where: { id },
        data: updateData,
        include: { category: true },
      });
      return food;
    } catch (error: any) {
      console.error(`[FoodService] update(${id}) error:`, error);
      // 🌟 Re-throw validation errors (like duplicate food codes) without overwriting them to 500
      if (error.statusCode) {
        throw error;
      }
      if (error.code === "P2025") {
        throw Object.assign(new Error("Food item not found"), {
          statusCode: 404,
        });
      }
      throw Object.assign(new Error("Failed to update food item"), {
        statusCode: 500,
      });
    }
  }

  static async delete(id: number) {
    // Optionally delete the image file from disk
    const existing = await prisma.foodItem.findUnique({ where: { id } });
    if (existing?.image && !existing.image.startsWith("http")) {
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
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );

      // Aggregate OrderItems from COMPLETED/PAID orders this month
      const salesAgg = await prisma.orderItem.groupBy({
        by: ["foodId"],
        where: {
          order: {
            createdAt: { gte: startOfMonth },
            OR: [{ status: "COMPLETED" }, { paymentStatus: "PAID" }],
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
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
        orderBy: { sortOrder: "asc" },
      });

      return fallback;
    } catch (error: any) {
      console.error("[FoodService] getPopularFoods error:", error);
      // Last resort fallback — return any available items
      const fallback = await prisma.foodItem.findMany({
        where: { isAvailable: true },
        include: { category: true },
        take: limit,
        orderBy: { sortOrder: "asc" },
      });
      return fallback;
    }
  }
}
