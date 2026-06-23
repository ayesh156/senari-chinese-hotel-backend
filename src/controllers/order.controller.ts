import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';

export const getOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await OrderService.getAll();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getLiveOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await OrderService.getLive();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const order = await OrderService.getById(id);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      orderType,
      items,
      subtotal,
      discount,
      total,
      amountPaid,
      customerName,
      customerId,
    } = req.body;

    const order = await OrderService.create({
      orderType,
      items,
      subtotal,
      discount,
      total,
      amountPaid,
      customerName,
      customerId: customerId ? parseInt(customerId, 10) : undefined,
    });
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { orderType, items, subtotal, discount, total, amountPaid, customerName, customerId } = req.body;

    const updated = await OrderService.update(id, {
      orderType,
      items,
      subtotal,
      discount,
      total,
      amountPaid,
      customerName,
      customerId: customerId ? parseInt(customerId, 10) : undefined,
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { status } = req.body;
    const updated = await OrderService.updateStatus(id, status);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await OrderService.delete(id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};