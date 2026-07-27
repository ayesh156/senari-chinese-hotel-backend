import { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { OrderService } from '../services/order.service';
import { AuditService, AuditEntities } from '../services/audit.service';

function auditCtx(authReq: AuthRequest) {
  return { userId: authReq.user?.userId, userName: authReq.user?.email ?? undefined, userRole: authReq.user?.role ?? undefined };
}

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

    // Non-blocking audit
    const authReq = req as AuthRequest;
    AuditService.created(
      AuditEntities.ORDER,
      order.id,
      { invoiceNumber: order.invoiceNumber, total: total, type: orderType },
      auditCtx(authReq)
    );

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

    // Non-blocking audit
    const authReq = req as AuthRequest;
    AuditService.updated(
      AuditEntities.ORDER,
      id,
      { oldStatus: undefined, newStatus: status, orderId: id },
      auditCtx(authReq)
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const authReq = req as AuthRequest;
    await OrderService.delete(id);

    // Non-blocking audit
    AuditService.deleted(
      AuditEntities.ORDER,
      id,
      { orderId: id },
      auditCtx(authReq)
    );

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
