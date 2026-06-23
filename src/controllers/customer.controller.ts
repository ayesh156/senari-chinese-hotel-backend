import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';

export const getCustomers = async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await CustomerService.getAll() }); } catch (e) { next(e); }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try { const id = parseInt(req.params.id as string, 10); res.json({ success: true, data: await CustomerService.getById(id) }); } catch (e) { next(e); }
};

export const getCustomerPayments = async (req: Request, res: Response, next: NextFunction) => {
  try { const id = parseInt(req.params.id as string, 10); res.json({ success: true, data: await CustomerService.getPayments(id) }); } catch (e) { next(e); }
};

export const getCustomerReminders = async (req: Request, res: Response, next: NextFunction) => {
  try { const id = parseInt(req.params.id as string, 10); res.json({ success: true, data: await CustomerService.getReminders(id) }); } catch (e) { next(e); }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, address, nic } = req.body;
    let image = req.body.image;
    if (req.file) image = `/uploads/customers/${req.file.filename}`;
    res.status(201).json({ success: true, data: await CustomerService.create({ name, phone, email, address, nic, image }) });
  } catch (e) { next(e); }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, phone, email, address, nic } = req.body;
    let image = req.body.image;
    if (req.file) image = `/uploads/customers/${req.file.filename}`;
    res.json({ success: true, data: await CustomerService.update(id, { name, phone, email, address, nic, image }) });
  } catch (e) { next(e); }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try { const id = parseInt(req.params.id as string, 10); await CustomerService.delete(id); res.json({ success: true, data: null }); } catch (e) { next(e); }
};

export const settleCustomerDue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { amount } = req.body;
    if (!amount || amount <= 0) { res.status(400).json({ success: false, error: 'A valid payment amount is required' }); return; }
    res.json({ success: true, data: await CustomerService.settleDue(id, Number(amount)) });
  } catch (e) { next(e); }
};

export const sendCustomerReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { message } = req.body;
    res.json({ success: true, data: await CustomerService.sendReminder(id, message || '') });
  } catch (e) { next(e); }
};