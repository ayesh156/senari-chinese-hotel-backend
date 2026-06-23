import { Request, Response, NextFunction } from 'express';
import { UnitService } from '../services/unit.service';

export const getUnits = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const units = await UnitService.getAll();
    res.json({ success: true, data: units });
  } catch (error) {
    next(error);
  }
};

export const createUnit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, abbreviation } = req.body;
    const unit = await UnitService.create({ name, abbreviation });
    res.status(201).json({ success: true, data: unit });
  } catch (error) {
    next(error);
  }
};

export const updateUnit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, abbreviation } = req.body;
    const unit = await UnitService.update(id, { name, abbreviation });
    res.json({ success: true, data: unit });
  } catch (error) {
    next(error);
  }
};

export const deleteUnit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await UnitService.delete(id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};