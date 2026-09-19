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
      serviceChargeRate, // 🌟 Extract percentage rate
      serviceCharge,     // 🌟 Extract calculated amount
      total,
      amountPaid,
      customerName,
      customerId,
      // 🌟 1. Web Checkout එකෙන් එවන අමතර fields ලබා ගැනීම
      phone,
      arrivalDate,
      arrivalTime,
    } = req.body;

    // 🌟 2. OrderService.create වෙත Service Charge සහ අමතර fields යැවීම
    const order = await OrderService.create({
      orderType,
      items,
      subtotal,
      discount,
      serviceChargeRate: serviceChargeRate !== undefined ? parseFloat(serviceChargeRate) : 0,
      serviceCharge: serviceCharge !== undefined ? parseFloat(serviceCharge) : 0,
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

   // 🌟 Unified Live Broadcast: Dispatches order_created for BOTH POS & Web to feed kitchen queue
    const orderSource = req.body.source || (req.body.phone || req.body.arrivalDate ? 'WEB' : 'POS');
    const enrichedOrder = { ...order, source: orderSource };

    try {
      // 🌟 කුස්සියේ Live Orders Queue එකට POS සහ Web orders දෙකම යවයි
      broadcastLiveEvent('orders', 'order_created', enrichedOrder);
      broadcastLiveEvent('orders', 'invoice_finalized', enrichedOrder);

      if (orderSource === 'WEB') {
        console.log(`[SSE] Web order notification dispatched for order #${order.id}`);
      } else {
        // POS orders කුස්සියට යන අතර, Notification Bell එක මඟින් source === 'POS' නිසා count එකට එකතු නොකරයි
        console.log(`[SSE] Quick POS order #${order.id} pushed to live kitchen queue.`);
      }
    } catch (sseErr) {
      console.warn('[SSE Broadcast Warning] Non-fatal notification error:', sseErr);
    }

    // 🌟 Immediate DB confirmation response to customer (Ends connection instantly)
    res.status(201).json({ success: true, data: enrichedOrder });
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { orderType, items, subtotal, discount, serviceChargeRate, serviceCharge, total, amountPaid, customerName, customerId } = req.body;

    const updated = await OrderService.update(id, {
      orderType,
      items,
      subtotal,
      discount,
      serviceChargeRate: serviceChargeRate !== undefined ? parseFloat(serviceChargeRate) : undefined,
      serviceCharge: serviceCharge !== undefined ? parseFloat(serviceCharge) : undefined,
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
