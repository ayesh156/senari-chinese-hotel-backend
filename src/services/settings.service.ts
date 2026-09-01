import prisma from '../lib/prisma';
import { AnalyticsService } from './analytics.service';
import { DashboardService } from './dashboard.service';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SystemSettings {
  id: number;
  hotelName: string;
  reportTagline: string;
  confidentialityNotice: string;
  currencySymbol: string;
  compactTableView: boolean;
  darkMode: boolean;
  playOrderSound: boolean;
  autoAcceptOrders: boolean;
  lowStockThreshold: number;
  pdfOrientation: string;
  updatedAt: string;
}

const DEFAULT_SETTINGS: Omit<SystemSettings, 'id' | 'updatedAt'> = {
  hotelName: 'Senari Restaurant',
  reportTagline: 'Business Intelligence & Performance Report',
  confidentialityNotice: 'Senari Restaurant — Confidential',
  currencySymbol: 'Rs.',
  compactTableView: false,
  darkMode: true,
  playOrderSound: true,
  autoAcceptOrders: false,
  lowStockThreshold: 6,
  pdfOrientation: 'portrait',
};

// ── Service ──────────────────────────────────────────────────────────────────

export class SettingsService {
  /**
   * getSettings — returns the singleton configuration row (id=1).
   * If none exists, seeds with defaults and returns them.
   */
  static async getSettings(): Promise<SystemSettings> {
    let row = await prisma.systemSetting.findUnique({
      where: { id: 1 },
    });

    if (!row) {
      row = await prisma.systemSetting.create({
        data: { id: 1, ...DEFAULT_SETTINGS },
      });
    }

    return SettingsService.mapRow(row);
  }

  /**
   * updateSettings — upserts all fields to the singleton row (id=1).
   * Merges provided fields with existing values; invalidates caches.
   */
  static async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const existing = await SettingsService.getSettings();

    const updated = await prisma.systemSetting.upsert({
      where: { id: 1 },
      update: {
        ...(data.hotelName !== undefined && { hotelName: data.hotelName }),
        ...(data.reportTagline !== undefined && { reportTagline: data.reportTagline }),
        ...(data.confidentialityNotice !== undefined && { confidentialityNotice: data.confidentialityNotice }),
        ...(data.currencySymbol !== undefined && { currencySymbol: data.currencySymbol }),
        ...(data.compactTableView !== undefined && { compactTableView: data.compactTableView }),
        ...(data.darkMode !== undefined && { darkMode: data.darkMode }),
        ...(data.playOrderSound !== undefined && { playOrderSound: data.playOrderSound }),
        ...(data.autoAcceptOrders !== undefined && { autoAcceptOrders: data.autoAcceptOrders }),
        ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
        ...(data.pdfOrientation !== undefined && { pdfOrientation: data.pdfOrientation }),
      },
      create: {
        id: 1,
        hotelName: data.hotelName ?? existing.hotelName,
        reportTagline: data.reportTagline ?? existing.reportTagline,
        confidentialityNotice: data.confidentialityNotice ?? existing.confidentialityNotice,
        currencySymbol: data.currencySymbol ?? existing.currencySymbol,
        compactTableView: data.compactTableView ?? existing.compactTableView,
        darkMode: data.darkMode ?? existing.darkMode,
        playOrderSound: data.playOrderSound ?? existing.playOrderSound,
        autoAcceptOrders: data.autoAcceptOrders ?? existing.autoAcceptOrders,
        lowStockThreshold: data.lowStockThreshold ?? existing.lowStockThreshold,
        pdfOrientation: data.pdfOrientation ?? existing.pdfOrientation,
      },
    });

    // Invalidate caches so dashboards/reports pick up new thresholds/titles
    AnalyticsService.invalidateCache();
    DashboardService.invalidateCache();

    return SettingsService.mapRow(updated);
  }

  private static mapRow(row: any): SystemSettings {
    return {
      id: row.id,
      hotelName: row.hotelName,
      reportTagline: row.reportTagline,
      confidentialityNotice: row.confidentialityNotice,
      currencySymbol: row.currencySymbol,
      compactTableView: row.compactTableView,
      darkMode: row.darkMode,
      playOrderSound: row.playOrderSound,
      autoAcceptOrders: row.autoAcceptOrders,
      lowStockThreshold: row.lowStockThreshold,
      pdfOrientation: row.pdfOrientation,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }
}