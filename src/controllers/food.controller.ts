import { Request, Response, NextFunction } from 'express';
import { FoodService } from '../services/food.service';

export const getFoods = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const foods = await FoodService.getAll();
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
    const { name, price, description, categoryId, isAvailable, isNew } = req.body;
    const imageFilename = req.file?.filename;

    // Service validates required fields; pass undefined only if truly missing
    const parsedPrice = price !== undefined ? parseFloat(price) : undefined;
    const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : undefined;
    const food = await FoodService.create({
      name,
      price: parsedPrice,
      description: description || undefined,
      categoryId: parsedCategoryId,
      isAvailable: isAvailable !== undefined
        ? isAvailable === 'true' || isAvailable === true
        : undefined,
      isNew: isNew !== undefined
        ? isNew === 'true' || isNew === true
        : undefined,
      imageFilename,
    });
    res.status(201).json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

export const updateFood = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, price, description, categoryId, isAvailable, isNew } = req.body;
    const imageFilename = req.file?.filename;

    const food = await FoodService.update(id, {
      name,
      price: price !== undefined ? parseFloat(price) : undefined,
      description: description || undefined,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      isAvailable: isAvailable !== undefined
        ? isAvailable === 'true' || isAvailable === true
        : undefined,
      isNew: isNew !== undefined
        ? isNew === 'true' || isNew === true
        : undefined,
      imageFilename,
    });
    res.json({ success: true, data: food });
  } catch (error) {
    next(error);
  }
};

export const deleteFood = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await FoodService.delete(id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};