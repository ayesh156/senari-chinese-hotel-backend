// 🌟 Native Node.js ESM Type-only import
import type { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service.ts';

export const getSettings = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await SettingsService.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updates: Record<string, any> = {};

    if (req.body.hotelName !== undefined) updates.hotelName = String(req.body.hotelName);
    if (req.body.reportTagline !== undefined) updates.reportTagline = String(req.body.reportTagline);
    if (req.body.confidentialityNotice !== undefined) updates.confidentialityNotice = String(req.body.confidentialityNotice);
    if (req.body.currencySymbol !== undefined) updates.currencySymbol = String(req.body.currencySymbol);
    if (req.body.compactTableView !== undefined) updates.compactTableView = Boolean(req.body.compactTableView);
    if (req.body.darkMode !== undefined) updates.darkMode = Boolean(req.body.darkMode);
    if (req.body.playOrderSound !== undefined) updates.playOrderSound = Boolean(req.body.playOrderSound);
    if (req.body.autoAcceptOrders !== undefined) updates.autoAcceptOrders = Boolean(req.body.autoAcceptOrders);
    if (req.body.lowStockThreshold !== undefined) updates.lowStockThreshold = Number(req.body.lowStockThreshold);
    if (req.body.pdfOrientation !== undefined) updates.pdfOrientation = String(req.body.pdfOrientation);
    if (req.body.showGenerationTimestamp !== undefined) updates.showGenerationTimestamp = Boolean(req.body.showGenerationTimestamp);

    // Support legacy field name "tagline" -> maps to "reportTagline"
    if (req.body.tagline !== undefined && updates.reportTagline === undefined) {
      updates.reportTagline = String(req.body.tagline);
    }

    const settings = await SettingsService.updateSettings(updates);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};