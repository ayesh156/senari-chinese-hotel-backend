# 📋 Workspace — Senari Chinese Hotel

> **Last updated:** June 16, 2026 — QA Build Verified + Documentation Updated

---

## ✅ Completed

### Phase 1–10 — All Prior Phases
- Customer Web App, POS Admin System, Extended POS Modules, Dashboard, Responsive Grids, Backend Integration, Database Schema, Seeding, Master Data CRUD, Food Items CRUD with Multer

### Phase 11 — Quick POS Cart & Order Processing
- `POST /api/orders` with `prisma.$transaction`
- `useCartStore` — Zustand store for POS cart
- QuickPOSPage fully integrated with live cart, order submission

### Phase 11b — Cart & Invoice Refinements
- **Shared ReceiptModal** — `frontend/src/components/pos/ReceiptModal.jsx`
  - Reusable across QuickPOSPage and InvoicesPage
  - 80mm thermal paper style with `bg-white text-black font-mono`
  - Pure black text (`text-black`) enforced — no dark mode overrides on paper
- **Invoice numbering** — Enterprise-grade collision-proof generator:
  - Backend: `async generateUniqueInvoiceNumber()` loops with `while` + DB check
  - Format: `INV` + 6 random digits (100000–999999), e.g. `INV582910`
- **Delete route** — `DELETE /api/orders/:id` with safe cascade (`orderItems` first)
- **Image rendering** — `getFullImageUrl()` helper normalizes all path formats
- **Tax/service removed** — Total = Subtotal − Discount (no tax/service charge)
- **Auto-receipt modal** — On successful payment, receipt preview opens immediately

### Build Verification
- **Backend:** `npx tsc --noEmit` → 0 errors (after fixing pre-existing TS2367/TS2322 in category/unit routes)
- **Frontend:** `npx vite build` → ✅ 2,763 modules transformed, output: `dist/`
- All pre-existing TypeScript type errors in `category.routes.ts` and `unit.routes.ts` fixed

---

## 🏛️ Current Architecture

```
senari-chinese-hotel/
├── frontend/                   ← React + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             ← Reusable UI (SearchableSelect, ModernPagination, etc.)
│   │   │   ├── modals/         ← Modal components
│   │   │   ├── pos/            ← POS-specific components
│   │   │   │   └── ReceiptModal.jsx  ← Shared receipt preview (new)
│   │   │   └── ...
│   │   ├── pages/pos/          ← POS pages (QuickPOSPage, InvoicesPage, etc.)
│   │   ├── utils/              ← Stores (cartStore, invoiceStore, foodStore, etc.)
│   │   └── ...
│   ├── dist/                   ← Production build output
│   └── vercel.json
│
├── backend/                    ← Express + Prisma + MySQL API
│   ├── src/
│   │   ├── index.ts            ← Express entry (CORS, static /uploads)
│   │   ├── routes/
│   │   │   ├── index.ts        ← Route aggregator
│   │   │   ├── order.routes.ts ← GET/POST/DELETE /api/orders + INV generator
│   │   │   ├── food.routes.ts  ← CRUD /api/foods (Multer)
│   │   │   ├── category.routes.ts
│   │   │   ├── unit.routes.ts
│   │   │   └── auth.routes.ts
│   │   └── lib/prisma.ts
│   ├── prisma/schema.prisma    ← 11 models + 7 enums
│   ├── public/uploads/foods/   ← Uploaded food images
│   └── ...
│
├── ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── README.md
├── RULES.md
├── WORKSPACE.md
└── .gitignore
```

---

## 🔜 Next Steps

### Remaining Backend Routes
- [ ] Inventory, Settings, Dashboard, Reports, Customers, Tables, Suppliers

### Medium Priority
- [ ] Split into two repos (frontend + backend)
- [ ] Purchase Orders → Inventory sync (global store)