// 🌟 Native Node.js ESM Type-only import
import type { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoice.service.ts';
import { broadcastLiveEvent } from '../gateways/orderLiveSync.gateway.ts';

export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      search,
      dateFrom,
      dateTo,
      paymentStatus,
      customerId,
      page,
      limit,
    } = req.query;

    const result = await InvoiceService.getAll({
      search: search as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      paymentStatus: paymentStatus as string,
      customerId: customerId ? parseInt(customerId as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const invoice = await InvoiceService.getById(id);
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

export const createInvoice = async (req: Request, res: Response, next: NextFunction) => {
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
      paymentMethod,
    } = req.body;

    const invoice = await InvoiceService.create({
      orderType,
      items,
      subtotal,
      discount,
      total,
      amountPaid,
      customerName,
      customerId: customerId ? parseInt(customerId, 10) : undefined,
      paymentMethod,
    });

    // 🌟 Broadcast finalized invoice to listening POS clients
    broadcastLiveEvent('invoices', 'invoice_created', invoice);

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};