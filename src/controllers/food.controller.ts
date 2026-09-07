import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { FoodService } from '../services/food.service';
import { AuditService, AuditEntities } from '../services/audit.service';

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

    const oldFood = await FoodService.getById(id);

    const toBool = (v: any) => v === 'true' || v === true;
    const parsedPrice = price !== undefined ? parseFloat(price) : undefined;
    const parsedIngredients = ingredients
      ? (typeof ingredients === 'string' ? ingredients.split(',').map((s: string) => s.trim()).filter(Boolean) : ingredients)
      : undefined;

    // Update food with new image catalog array and selected primary image
    const food = await FoodService.update(id, {
      name,
      price: parsedPrice,
      description: description || undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      isAvailable: isAvailable !== undefined ? toBool(isAvailable) : undefined,
      isNew: isNew !== undefined ? toBool(isNew) : undefined,
      isFeatured: isFeatured !== undefined ? toBool(isFeatured) : undefined,
      isHealthy: isHealthy !== undefined ? toBool(isHealthy) : undefined,
      prepTimeMinutes: prepTimeMinutes !== undefined ? parseInt(prepTimeMinutes, 10) : undefined,
      calories: calories !== undefined ? parseInt(calories, 10) : undefined,
      serves: serves || undefined,
      ingredients: parsedIngredients,
      primaryImage: finalPrimary,
      imagesCatalog,
      imageUrl,
    });

    const authReq = req as AuthRequest;
    const details: Record<string, unknown> = { foodId: id, name: food.name };

    if (price !== undefined && oldFood && Number(oldFood.price) !== parsedPrice) {
      details.oldPrice = Number(oldFood.price);
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