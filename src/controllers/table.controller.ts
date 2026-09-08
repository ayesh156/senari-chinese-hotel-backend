import { Request, Response, NextFunction } from 'express';
import { TableService } from '../services/table.service.ts';

export const getTables = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await TableService.getAll();
    res.json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
};

export const getTableById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const table = await TableService.getById(id);
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

export const createTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableNumber, capacity, notes } = req.body;
    const table = await TableService.create({ tableNumber, capacity, notes });
    res.status(201).json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

export const updateTableStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { status, liveOrderId, reservationNotes } = req.body;

    // Validate status is a valid enum value before calling service
    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const table = await TableService.updateStatus(id, { status, liveOrderId, reservationNotes });
    res.json({ success: true, data: table });
  } catch (error) {
    next(error);
  }
};

export const deleteTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await TableService.delete(id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};