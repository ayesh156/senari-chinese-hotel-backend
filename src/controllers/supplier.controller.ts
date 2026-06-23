import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplier.service';

export const getSuppliers = async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await SupplierService.getAll() }); } catch (e) { next(e); }
};
export const getSupplierById = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await SupplierService.getById(parseInt(req.params.id)) }); } catch (e) { next(e); }
};
export const getSupplierPayments = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await SupplierService.getPayments(parseInt(req.params.id)) }); } catch (e) { next(e); }
};
export const getSupplierReminders = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await SupplierService.getReminders(parseInt(req.params.id)) }); } catch (e) { next(e); }
};
export const createSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try { const { name, phone, email, address, category } = req.body; res.status(201).json({ success: true, data: await SupplierService.create({ name, phone, email, address, category }) }); } catch (e) { next(e); }
};
export const updateSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try { const { name, phone, email, address, category } = req.body; res.json({ success: true, data: await SupplierService.update(parseInt(req.params.id), { name, phone, email, address, category }) }); } catch (e) { next(e); }
};
export const deleteSupplier = async (req: Request, res: Response, next: NextFunction) => {
  try { await SupplierService.delete(parseInt(req.params.id)); res.json({ success: true, data: null }); } catch (e) { next(e); }
};
export const settleSupplierPayable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ success: false, error: 'Valid amount required' }); return; }
    res.json({ success: true, data: await SupplierService.settlePayable(parseInt(req.params.id), Number(amount)) });
  } catch (e) { next(e); }
};
export const sendSupplierReminder = async (req: Request, res: Response, next: NextFunction) => {
  try { const { message } = req.body; res.json({ success: true, data: await SupplierService.sendReminder(parseInt(req.params.id), message || '') }); } catch (e) { next(e); }
};