import { Request, Response, NextFunction } from 'express';
import { PurchaseOrderService } from '../services/purchaseOrder.service';

export const createPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await PurchaseOrderService.create(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await PurchaseOrderService.getAll();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const order = await PurchaseOrderService.getById(id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const order = await PurchaseOrderService.update(id, req.body);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const deletePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await PurchaseOrderService.delete(id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

export const settlePurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { amount, paymentMethod, notes } = req.body;
    const result = await PurchaseOrderService.settle(id, { amount, paymentMethod, notes });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};