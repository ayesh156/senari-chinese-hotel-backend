// 🌟 Native Node.js ESM Type-only import
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.ts';
import { FoodService } from '../services/food.service.ts';
import { AuditService, AuditEntities } from '../services/audit.service.ts';

function auditCtx(authReq: AuthRequest) {
  return { userId: authReq.user?.userId, userName: authReq.user?.email ?? undefined, userRole: authReq.user?.role ?? undefined };
}

export const getFoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      maxPrice,
      isHealthy,
      isNew,
      categoryId,
      categorySlug,
      search,
    } = req.query;

    const foods = await FoodService.getAll({
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      isHealthy: isHealthy !== undefined ? isHealthy === 'true' : undefined,
      isNew: isNew !== undefined ? isNew === 'true' : undefined,
      categoryId: categoryId ? parseInt(categoryId as string, 10) : undefined,
      categorySlug: categorySlug as string | undefined,
      search: search as string | undefined,
    });

    res.json({ success: true, data: foods });
  } catch (error) {
    next(error);
  }
};

export const getFoodById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const food = await FoodService.getById(id);
    res.json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

export const createFood = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name, price, description, categoryId,
      isAvailable, isNew, isFeatured, isHealthy,
      prepTimeMinutes, calories, imageUrl,
      serves, ingredients, primaryImage, existingImages,
    } = req.body;

    // Handle multiple files from req.files
    const files = (req.files as Express.Multer.File[]) || [];
    const uploadedPaths = files.map(f => `/uploads/foods/${f.filename}`);

    // Parse existing image paths already in DB
    let parsedExisting: string[] = [];
    if (existingImages) {
      try {
        parsedExisting = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
      } catch {
        parsedExisting = [existingImages];
      }
    }

    const imagesCatalog = [...parsedExisting, ...uploadedPaths];
    const finalPrimary = primaryImage || imagesCatalog[0] || (files[0] ? `/uploads/foods/${files[0].filename}` : undefined);

    const parsedPrice = price !== undefined ? parseFloat(price) : undefined;
    const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : undefined;
    const parsedPrepTime = prepTimeMinutes !== undefined ? parseInt(prepTimeMinutes, 10) : undefined;
    const parsedCalories = calories !== undefined ? parseInt(calories, 10) : undefined;
    const parsedIngredients = ingredients
      ? (typeof ingredients === 'string' ? ingredients.split(',').map((s: string) => s.trim()).filter(Boolean) : ingredients)
      : undefined;

    const toBool = (v: any) => v === 'true' || v === true;

    // Pass image catalog array and selected primary image to FoodService
    const food = await FoodService.create({
      name,
      price: parsedPrice,
      description: description || undefined,
      categoryId: parsedCategoryId,
      isAvailable: isAvailable !== undefined ? toBool(isAvailable) : undefined,
      isNew: isNew !== undefined ? toBool(isNew) : undefined,
      isFeatured: isFeatured !== undefined ? toBool(isFeatured) : undefined,
      isHealthy: isHealthy !== undefined ? toBool(isHealthy) : undefined,
      prepTimeMinutes: parsedPrepTime,
      calories: parsedCalories,
      serves: serves || undefined,
      ingredients: parsedIngredients,
      primaryImage: finalPrimary,
      imagesCatalog,
      imageUrl,
    });

    const authReq = req as AuthRequest;
    AuditService.created(
      AuditEntities.FOOD_ITEM,
      food.id,
      { name: food.name, price: parsedPrice, categoryId: parsedCategoryId },
      auditCtx(authReq)
    );

    res.status(201).json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

export const updateFood = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const {
      name, price, description, categoryId,
      isAvailable, isNew, isFeatured, isHealthy,
      prepTimeMinutes, calories, imageUrl,
      serves, ingredients, primaryImage, existingImages,
    } = req.body;

    // 🌟 1. Fetch current food record first to prevent null/undefined overwrites on fallback
    const currentFood = await FoodService.getById(id);
    if (!currentFood) {
      res.status(404).json({ success: false, message: 'Food item not found' });
      return;
    }

    // 🌟 2. Handle multiple files from req.files safely
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    const newUploadedPaths = uploadedFiles.map(f => `/uploads/foods/${f.filename}`);

    // 🌟 3. Clean & sanitize existing image paths (filters out "null", "undefined", and empty strings)
    let sanitizedExisting: string[] = [];
    if (existingImages && existingImages !== 'null' && existingImages !== 'undefined') {
      try {
        const decoded = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
        sanitizedExisting = Array.isArray(decoded) ? decoded.filter(Boolean) : [decoded].filter(Boolean);
      } catch {
        sanitizedExisting = [existingImages].filter(Boolean);
      }
    } else if (currentFood.images && Array.isArray(currentFood.images)) {
      sanitizedExisting = (currentFood.images as string[]).filter(Boolean);
    }

    const compiledImagesCatalog = [...sanitizedExisting, ...newUploadedPaths];

    // 🌟 4. Clean Primary Image fallback: Never pass "null" / "undefined" string to Prisma
    const cleanPrimary = (primaryImage && primaryImage !== 'null' && primaryImage !== 'undefined')
      ? primaryImage
      : undefined;

    const resolvedPrimary = cleanPrimary 
      || compiledImagesCatalog[0] 
      || (uploadedFiles[0] ? `/uploads/foods/${uploadedFiles[0].filename}` : undefined) 
      || currentFood.image 
      || undefined;

    const toBool = (v: any) => v === 'true' || v === true;
    const parsedPrice = (price !== undefined && price !== 'null' && price !== '') ? parseFloat(price) : undefined;
    const parsedCategoryId = (categoryId && categoryId !== 'null' && categoryId !== 'undefined') ? parseInt(categoryId, 10) : undefined;
    const parsedPrepTime = (prepTimeMinutes !== undefined && prepTimeMinutes !== 'null' && prepTimeMinutes !== '') ? parseInt(prepTimeMinutes, 10) : undefined;
    const parsedCalories = (calories !== undefined && calories !== 'null' && calories !== '') ? parseInt(calories, 10) : undefined;

    const parsedIngredients = ingredients
      ? (typeof ingredients === 'string' ? ingredients.split(',').map((s: string) => s.trim()).filter(Boolean) : ingredients)
      : undefined;

    // 🌟 5. Update food with fully sanitized types, preventing Prisma 500 runtime crashes
    const food = await FoodService.update(id, {
      name: (name && name !== 'null') ? name : currentFood.name,
      price: parsedPrice,
      description: (description && description !== 'null' && description !== 'undefined') ? description : undefined,
      categoryId: parsedCategoryId,
      isAvailable: isAvailable !== undefined ? toBool(isAvailable) : undefined,
      isNew: isNew !== undefined ? toBool(isNew) : undefined,
      isFeatured: isFeatured !== undefined ? toBool(isFeatured) : undefined,
      isHealthy: isHealthy !== undefined ? toBool(isHealthy) : undefined,
      prepTimeMinutes: parsedPrepTime,
      calories: parsedCalories,
      serves: (serves && serves !== 'null' && serves !== 'undefined') ? serves : undefined,
      ingredients: parsedIngredients,
      primaryImage: resolvedPrimary,
      imagesCatalog: compiledImagesCatalog.length > 0 ? compiledImagesCatalog : undefined,
      imageUrl: (imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined') ? imageUrl : undefined,
    });

    const authReq = req as AuthRequest;
    const details: Record<string, unknown> = { foodId: id, name: food.name };

    if (price !== undefined && currentFood && Number(currentFood.price) !== parsedPrice) {
      details.oldPrice = Number(currentFood.price);
      details.newPrice = parsedPrice;
      AuditService.log({
        ...auditCtx(authReq),
        action: 'PRICE_CHANGE',
        entity: AuditEntities.FOOD_ITEM,
        entityId: id,
        details,
      });
    } else {
      AuditService.updated(
        AuditEntities.FOOD_ITEM,
        id,
        details,
        auditCtx(authReq)
      );
    }

    res.json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

export const getPopularFoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
    const foods = await FoodService.getPopularFoods(limit);
    res.json({ success: true, data: foods });
  } catch (error) {
    next(error);
  }
};

export const deleteFood = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const authReq = req as AuthRequest;
    const oldFood = await FoodService.getById(id).catch(() => null);

    await FoodService.delete(id);

    AuditService.deleted(
      AuditEntities.FOOD_ITEM,
      id,
      { name: oldFood?.name, foodId: id },
      auditCtx(authReq)
    );

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};