import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';

export const getInventoryItems = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await InventoryService.getAll();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const getInventoryItemById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const item = await InventoryService.getById(id);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const getInventoryItemHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const records = await InventoryService.getHistory(id);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

export const createInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sku, name, categoryId, quantity, unitId, minAlertLevel, unitPrice } = req.body;
    const item = await InventoryService.create({
      sku,
      name,
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
      unitId: unitId ? parseInt(unitId, 10) : undefined,
      minAlertLevel: minAlertLevel !== undefined ? parseFloat(minAlertLevel) : undefined,
      unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { sku, name, categoryId, quantity, unitId, minAlertLevel, unitPrice } = req.body;
    const item = await InventoryService.update(id, {
      sku,
      name,
      categoryId: categoryId !== undefined ? parseInt(categoryId, 10) : undefined,
      quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
      unitId: unitId !== undefined ? parseInt(unitId, 10) : undefined,
      minAlertLevel: minAlertLevel !== undefined ? parseFloat(minAlertLevel) : undefined,
      unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
    });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const adjustInventoryItemStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { newQuantity, adjustmentType, notes } = req.body;
    const item = await InventoryService.adjustStock(id, {
      newQuantity: newQuantity !== undefined ? parseFloat(newQuantity) : undefined,
      adjustmentType: adjustmentType || 'Manual Adjustment',
      notes: notes || undefined,
    });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const deleteInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await InventoryService.delete(id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};