// 🌟 Native Node.js ESM Type-only import
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.ts';
import { OrderService } from '../services/order.service.ts';
import { AuditService, AuditEntities } from '../services/audit.service.ts';
import { broadcastLiveEvent } from '../gateways/orderLiveSync.gateway.ts';

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
      // 🌟 1. Web Checkout එකෙන් එවන අමතර fields ලබා ගැනීම
      phone,
      arrivalDate,
      arrivalTime,
    } = req.body;

    // 🌟 2. OrderService.create වෙත phone, arrivalDate, arrivalTime යැවීම
    const order = await OrderService.create({
      orderType,
      items,
      subtotal,
      discount,
      total,
      amountPaid,
      customerName,
      customerId: customerId ? parseInt(customerId, 10) : undefined,
      phone,
      arrivalDate,
      arrivalTime,
    });

    // 🛡️ 3. Safe Non-blocking audit (Public customer orders වලදී crash නොවී ක්‍රියාත්මක වීමට)
    try {
      const authReq = req as AuthRequest;
      if (typeof AuditService !== 'undefined' && typeof auditCtx === 'function') {
        AuditService.created(
          AuditEntities.ORDER,
          order.id,
          { invoiceNumber: order.invoiceNumber, total: total, type: orderType },
          auditCtx(authReq)
        );
      }
    } catch (auditErr) {
      // Ignore audit failure for guest/web checkouts
    }

    // 🛡️ Multi-Channel / Multi-Event Real-Time Push:
    // Dispatches to both 'orders' and 'invoices' channels using standard event aliases
    // so Kanban, Kitchen boards, and Invoices tables update simultaneously without page refreshes.
    try {
      // 1. Send to Orders channel (supports both order_created and invoice_finalized listeners)
      broadcastLiveEvent('orders', 'order_created', order);
      broadcastLiveEvent('orders', 'invoice_finalized', order);

      // 2. Send to Invoices channel
      broadcastLiveEvent('invoices', 'invoice_created', order);
      broadcastLiveEvent('invoices', 'invoice_finalized', order);
    } catch (sseErr) {
      console.warn('[SSE Broadcast Warning] Non-fatal notification error:', sseErr);
    }

    // 🌟 Immediate DB confirmation response to customer (Ends connection instantly)
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

    // 🌟 Broadcast updated status to POS screens
    broadcastLiveEvent('orders', 'order_status_updated', updated);

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
