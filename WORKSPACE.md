# 📋 Workspace — Senari Chinese Hotel

> **Last updated:** June 15, 2026 — Phase 10b: Seed data populated & store extraction fix

---

## ✅ Completed

### Phase 1 — Customer Web App
- [x] Project scaffold (Vite + React + Tailwind + Zustand + Framer Motion)
- [x] `ThemeContext` — light / dark / system with localStorage persistence
- [x] `MainWebLayout` — Navbar, MobileDrawer, SlideCart, FloatingActionButtons
- [x] `HomePage` — Hero + Popular Items
- [x] `MenuPage` — Filters + Search + Sort + Pagination (URL-synced state)
- [x] `ProductViewPage` — Detail + Qty + Suggestions
- [x] `AboutPage` — Story + Values + Gallery
- [x] `ContactPage` — Details + Google Map embed + Contact Form
- [x] `CheckoutPage` — Order form + Discount + Pay at Counter
- [x] `OrderSuccessPage` — Confirmation + Discount + Grand Total
- [x] `FoodCard` — Clickable card → `/menu/:id`
- [x] `SlideCart` — Slide-over cart → `/checkout`
- [x] `ModernSelect` — Premium animated custom dropdown (web app)
- [x] `AnimatedSection` — Framer Motion scroll-reveal wrapper
- [x] `FloatingActionButtons` — WhatsApp FAB + Scroll-to-Top FAB
- [x] `useCartStore` — Zustand cart with localStorage persistence
- [x] `vercel.json` — SPA catch-all rewrite

### Phase 2 — POS Admin System
- [x] `StaffLoginPage` — PIN pad, 3 staff cards, shake animation, keyboard support
- [x] `ProtectedRoute` — Auth guard redirecting to `/pos/login`
- [x] `POSLayout` — Collapsible sidebar (w-64↔w-20), live clock, theme-aware
- [x] `POSDashboardPage` — Metric cards, area chart, category stats, order table
- [x] `LiveOrdersPage` — 3-col Kanban, search+filter, 8/page pagination
- [x] `InvoicesPage` — Full CRUD, thermal receipt, InvoiceFormModal wizard
- [x] `InvoiceFormModal` — 3-step wizard (Details→Items→Review), edit mode
- [x] `FoodsListPage` — Table, More Options filters, 8/page ModernPagination
- [x] `FoodFormPage` — 2-col form, canvas compression, paste, SearchableSelect
- [x] `QuickPOSPage` — Full-screen touch POS, thermal print, F-key shortcuts, tax/service charge
- [x] `ThermalReceipt` — 80mm thermal receipt popup with `@page` CSS
- [x] `ReportsPage` — KPIs, area chart, pie chart, top/least selling foods
- [x] `SettingsPage` — 4 tabs: General, Business Hours, System Preferences, Messaging
- [x] `settingsStore` — Zustand store for billing/POS preferences (localStorage)
- [x] `SearchableSelect` — POS combobox with sticky search, clearable, framer-motion
- [x] `ModernPagination` — Orange→red gradient active page, smart ellipsis

### Phase 3 — Extended POS Modules
- [x] `InventoryPage` — CRUD, stock adjustments, table+grid view, sort, status badges
- [x] `MasterDataPage` — CRUD for food categories, inventory categories, units
- [x] `masterDataStore` — Zustand store for lookup lists (localStorage)
- [x] `CustomersPage` — Enterprise CRM: CRUD, avatar upload, partial payments, reminder system, history modal
- [x] `TableManagementPage` — Grid+list, click-to-cycle status, CRUD
- [x] `SuppliersPage` — Supplier CRUD, partial/full payment settle
- [x] `PurchaseOrdersPage` — 3-step wizard, view/delete, status badges, supplier+inventory integration

### Phase 4 — Dashboard Enhancements
- [x] `POSDashboardPage` — `QuickLinksPanel`: 4 shortcut cards (Low Stock · Pending Payables · Live Orders · Customers with Dues)
- [x] `POSDashboardPage` — `LowStockPanel`: conditional on `showLowStockOnDashboard` setting; grid of low/out-of-stock items with stock bars + "View All" → `/pos/inventory`
- [x] `settingsStore` — `showLowStockOnDashboard` default changed to `true`
- [x] `CustomersPage` — Avatar in table row: replaced fragile `style.display` trick with Tailwind `hidden`/`flex` classes + `onerror` fallback

### Phase 5 — Responsive Grid Views (All Core Pages)
- [x] `CustomersPage` — `CustomerCard` component: avatar (image or initials), name, phone, stats grid (Orders/Spent/Due), due badge, action buttons (View/Edit/Delete/Settle/Remind) in card footer
- [x] `CustomersPage` — `viewMode` auto-switch: `window.matchMedia('(max-width: 767px)')` listener sets grid on mobile, table on desktop; user can override via toggle
- [x] `CustomersPage` — Grid layout: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, shared `ModernPagination`, empty state
- [x] `CustomersPage` — Removed unused `Upload` and `Field` imports
- [x] `FoodsListPage` — Unified responsive grid: normalized `'card'` → `'grid'` viewMode value; auto-switch useEffect; segmented List/LayoutGrid toggle in filter bar
- [x] `InvoicesPage` — Responsive grid view: card shows INV#, date, customer, type badge, total, payment status pill, View/Delete actions; auto-switch useEffect; fixed pre-existing duplicate JSX corruption
- [x] `InventoryPage` — Responsive grid view: card shows item name, SKU, category pill, stock qty+value, status badge, Adjust/Edit/Delete actions; auto-switch useEffect added; toggle moved from inner header into filter bar; normalized `'card'` → `'grid'`
- [x] `SuppliersPage` — Full responsive grid added: card shows avatar initials, name, phone, category pill, purchases+payable stats, outstanding alert, Edit/Delete/Settle actions; `viewMode` state + auto-switch useEffect + `List`/`LayoutGrid` imports added; toggle in filter bar
- [x] `PurchaseOrdersPage` — Full responsive grid added: card shows PO#, date, status pill, supplier avatar, total/balance stats, items count, View/Delete actions; `viewMode` state + auto-switch useEffect + `List`/`LayoutGrid` imports added; toggle in filter bar; `ModernPagination` always rendered
- [x] `TableManagementPage` — Auto-switch useEffect added (defaults to grid, locks to grid on mobile); `useEffect` import added

### Phase 6 — Backend Integration
- [x] **Backend scaffold created** — `backend/` folder with Express + TypeScript + Prisma skeleton
- [x] **Express entry point** — `backend/src/index.ts` with CORS, JSON parser, health check
- [x] **Prisma ORM skeleton** — `backend/prisma/schema.prisma` with MySQL provider
- [x] **TypeScript config** — `backend/tsconfig.json` for Node.js compilation
- [x] **Environment template** — `backend/.env.example` with database URL + port config
- [x] **ARCHITECTURE.md updated** — Full stack documented
- [x] **`vercel.json` moved** — From root → `frontend/vercel.json`
- [x] **Root cleanup** — Deleted obsolete `node_modules/`, `dist/`, `package.json`, `package-lock.json`
- [x] **`.gitignore` hardened** — Added `.env`, `.env.*` to global ignore rules
- [x] **Architecture pivoted** — From NPM Workspaces monorepo → **two independent projects** for separate Git repositories

### Phase 7 — Database Schema Design (Prisma)
- [x] **Prisma schema written** — 11 models + 7 enums with full MySQL types and relationships
- [x] **FoodItem / Category / Unit models** — Menu items with FOOD-type category, measurement units
- [x] **InventoryItem / InventoryAdjustment models** — Stock tracking with SKU, min alerts, adjustment log
- [x] **Customer model** — Phone-based unique identifier, due tracking, reminder count
- [x] **Supplier / PurchaseOrder / PurchaseOrderItem models** — Supplier management with PO lifecycle
- [x] **Order / OrderItem models** — Invoice lifecycle from PENDING → COMPLETED, price snapshots
- [x] **RestaurantTable model** — Table management with AVAILABLE/OCCUPIED/RESERVED status
- [x] **User model** — Staff accounts with role-based access (ADMIN/CASHIER/STAFF)
- [x] **DATABASE_SCHEMA.md updated** — Full documentation with ERD, column references, business rules, and frontend mock data mapping

### Phase 8 — Database Seeding & API Scaffolding
- [x] **Auth dependencies installed** — bcryptjs + jsonwebtoken + type definitions
- [x] **Seed script created** — `backend/prisma/seed.ts` clears data, creates Admin user (hashed password), 6 food categories, 8 inventory categories, 12 units
- [x] **API directory structure scaffolded** — `controllers/`, `routes/`, `middlewares/` folders
- [x] **Auth route** — POST `/api/auth/login` with JWT token generation
- [x] **Food route** — GET `/api/foods` fetching all FoodItems with category includes
- [x] **Routes consolidated** — `src/routes/index.ts` mounts auth + food under `/api`
- [x] **Express entry point updated** — `src/index.ts` now imports and mounts consolidated routes
- [x] **WORKSPACE.md updated** — Seed script runnable via `npm run seed`

### Phase 9 — Master Data Full-Stack CRUD Implementation
- [x] **Category API routes** — GET/POST/PUT/DELETE `/api/categories` with FOOD/INVENTORY type filter and referential integrity checks
- [x] **Unit API routes** — GET/POST/PUT/DELETE `/api/units` with name/abbreviation and referential integrity checks
- [x] **Frontend API client** — `frontend/src/lib/api.ts` created with standard `{ success, data, error }` response handling
- [x] **Zustand store refactored** — `useMasterDataStore` replaced mock data with async API calls (fetchAll, addCategory, addUnit, renameCategory, renameUnit, deleteCategory, deleteUnit)
- [x] **MasterDataPage updated** — Added loading spinner, error display, and `useEffect` to fetch data on mount
- [x] **MasterDataListPanel simplified** — Removed local usage-count logic (delegated to server-side referential integrity checks)
- [x] **Standard response format** — All backend endpoints now return `{ success: boolean, data?: any, error?: string }`
- [x] **ARCHITECTURE.md updated** — API endpoints table updated with status, Master Data Data Flow diagram added
- [x] **RULES.md updated** — Added standard API response format rule
- [x] **WORKSPACE.md updated** — Phase 9 marked complete

### Phase 10 — Food Items Full-Stack CRUD with Multer File Uploads
- [x] **Backend food routes completed** — GET/POST/PUT/DELETE `/api/foods` with full CRUD
- [x] **GET /api/foods/:id** — Single food item fetch for edit mode
- [x] **Multer file upload configured** — Disk storage to `public/uploads/foods/`, 5 MB limit, image-only filter
- [x] **Static file serving** — `app.use('/uploads', express.static(...))` in index.ts
- [x] **Descending sort order** — `orderBy: { createdAt: 'desc' }` so new items appear first
- [x] **Image cleanup on delete** — `DELETE /api/foods/:id` removes the image file from disk
- [x] **Frontend Zustand store** — `useFoodStore` with bulletproof `extract()` + CRUD methods
- [x] **FoodFormPage rewritten** — Proper `FormData` submission (no Base64), category dropdown uses `c.id` (integer), auto-fetches categories via `useMasterDataStore`
- [x] **Image upload area refactored** — Stores raw `File` object for FormData, uses `URL.createObjectURL` for preview (no Canvas compression/Base64)
- [x] **ARCHITECTURE.md updated** — Food API endpoints table with multipart fields, Food Items Data Flow diagram, Backend Stack updated with Multer
- [x] **RULES.md updated** — Added file upload rule: "use multipart/form-data and Multer, not Base64"
- [x] **WORKSPACE.md updated** — Phase 10 marked complete

### Phase 10b — Seeding & Store Fix
- [x] **foodStore.js fixed** — Replaced `api.ts` wrapper with native `fetch` + bulletproof extraction pattern (matching `masterDataStore`)
- [x] **Seed data added** — 12 food items with realistic names, prices, descriptions, and category associations
- [x] **RULES.md updated** — Added frontend data extraction rule + seed data rule
- [x] **WORKSPACE.md updated** — Phase 10b marked complete

---

## 🏛️ Current Architecture

```
senari-chinese-hotel/           ← This repository will split into two
│
├── frontend/                   ← Independent React + Vite SPA
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json             ← Deployed to Vercel
│   └── ... (all frontend files)
│
├── backend/                    ← Independent Express + Prisma + MySQL API
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── README.md
├── RULES.md
├── WORKSPACE.md
└── .gitignore
```

**Key decision:** The `frontend/` and `backend/` folders are now **fully independent**. Each has its own:
- `package.json` with all dependencies declared locally
- `node_modules/` (installed separately per folder)
- Git repository (to be hosted in separate repos)
- Deployment pipeline (Vercel for frontend, Render/VPS for backend)

---

## 🔜 Next Steps

### Phase 9 — Backend Engineering (Priority)
- [x] **Run seed script** — Executed `npx prisma db seed` — 12 food items populated
- [ ] **Build remaining route modules** — Categories, Orders, Invoices, Customers, Tables, Inventory, Settings, Dashboard, Reports
- [ ] **Add auth middleware** — JWT middleware to protect routes
- [ ] **Connect frontend API client** — Update `frontend/src/lib/api.ts` to point to real backend

### Medium Priority
- [ ] **Split into two repos** — Create `senari-chinese-hotel-frontend` and `senari-chinese-hotel-backend` repositories
- [ ] **Purchase Orders → Inventory sync (global store)** — Currently PO page syncs its own local `inventory` state. When a real store/API is added, the sync should propagate to `InventoryPage` state as well.
- [ ] **`/cart` route** — Currently a "coming soon" placeholder. Build a dedicated cart page or redirect to checkout.

---

## 📊 Sprint Log

| Sprint | Feature | Status |
|--------|---------|--------|
| 1–7    | Customer Web App (all pages) | ✅ Done |
| 8–15   | POS Layout + Dashboard + Live Orders | ✅ Done |
| 16–18  | Invoices + Settings + Foods | ✅ Done |
| 19–22  | FoodForm + QuickPOS + Reports | ✅ Done |
| 23–25  | QuickPOS polish (shortcuts, tax, pagination) | ✅ Done |
| 26–28  | Inventory + Master Data + settingsStore wiring | ✅ Done |
| 29–31  | Customers CRM + Tables + Suppliers | ✅ Done |
| 33     | Dashboard QuickLinksPanel + LowStockPanel + customer avatar fix + settingsStore default | ✅ Done |
| 34     | CustomersPage responsive grid/card view + mobile auto-switch + CustomerCard component | ✅ Done |
| 35     | Unified responsive grid across all 6 core pages | ✅ Done |
| 36     | Backend scaffold + Monorepo initial setup | ✅ Done |
| 37     | Pivoted to independent projects (removed monorepo config, separate repos) | ✅ Done |
| 38     | Database Schema Design — 11 models + 7 enums, full Prisma schema, DATABASE_SCHEMA.md rewrite | ✅ Done |
| 39     | Database Seeding & API Scaffolding — seed script, auth route, food route, consolidated router, Express entry point | ✅ Done |
| 40     | Master Data Full-Stack CRUD — Categories + Units API routes, Zustand async store, frontend loading states, standard response format | ✅ Done |
| 41     | Food Items Full-Stack CRUD — Multer file uploads, FormData submission, Zustand foodStore, image cleanup on delete | ✅ Done |
| 42     | Store extraction fix — foodStore.js native fetch + Prisma seed data (12 items) + docs updated | ✅ Done |
