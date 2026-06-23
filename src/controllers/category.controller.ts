import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const typeFilter = req.query.type as string | undefined;
    const categories = await CategoryService.getAll(typeFilter);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type } = req.body;
    const category = await CategoryService.create({ name, type });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name } = req.body;
    const category = await CategoryService.update(id, { name });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await CategoryService.delete(id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};