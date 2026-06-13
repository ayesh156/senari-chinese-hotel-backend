# 🏗️ Senari Chinese Hotel — Application Architecture

> **Last updated:** June 12, 2026 — Monorepo Restructure: Frontend (React/Vite) + Backend (Express/Prisma/MySQL)
>
> **Business Logic:** Order Ahead for Pick-up or Dine-in only. No home delivery. Pay at Counter.
>
> **Deployment:** Frontend → Vercel SPA / Backend → Render (or VPS)

---

## 🏛️ Full-Stack Monorepo Architecture

```
senari-chinese-hotel/                   ← Monorepo root
├── frontend/                           ← React + Vite SPA (customer web + POS admin)
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vercel.json                     ← Vercel SPA deployment config
│
├── backend/                            ← Express + Prisma + MySQL API (NEW - Phase 1)
│   ├── prisma/
│   │   └── schema.prisma               ← Data models (placeholder skeleton)
│   ├── src/
│   │   ├── index.ts                    ← Express entry point (CORS, health check)
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   ├── public/
│   │   └── uploads/                    ← File storage (products, receipts, etc.)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .env
│
├── ARCHITECTURE.md                     ← This file
├── DATABASE_SCHEMA.md                  ← Schema documentation
├── README.md
├── RULES.md
├── WORKSPACE.md                        ← Progress tracker
└── .gitignore
```

---

## 🖥️ Frontend Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 3 |
| State Management | Zustand (persist middleware) |
| Routing | react-router-dom v7 |
| Animation | Framer Motion |
| Charts | Recharts |
| UI Icons | Lucide React |
| Deployment | Vercel (SPA, vercel.json catch-all) |

---

## 🖧 Backend Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (TypeScript) |
| Framework | Express.js v5 |
| Language | TypeScript 6 |
| ORM | Prisma 7 |
| Database | MySQL |
| Auth | JWT (jsonwebtoken + bcryptjs) — planned |
| Real-time | Socket.IO — planned |
| File Uploads | Multer — planned |
| Dev Runner | ts-node-dev (hot-reload) |
| Deployment | Render.com (or VPS) |

---

## 📁 Frontend Folder Structure

```
frontend/src/
├── assets/
├── components/
│   ├── ui/                  # Reusable UI components (AnimatedSection, FoodCard, ModernSelect, etc.)
│   ├── modals/              # Modal components (DeleteConfirmationModal, InvoiceWizardModal)
│   ├── sections/            # Page sections (BestSellers, BrandEthos, Collections)
│   ├── ecommerce/           # Storefront components (HeroSection, ShopByCollection, etc.)
│   ├── Layout.tsx
│   ├── ProtectedRoute.tsx
│   ├── ReceiptPrint.tsx
│   └── ThermalReceipt.tsx
├── contexts/                # React contexts (AuthContext, CartContext, ThemeContext, WishlistContext)
├── data/                    # Mock data (mockData.ts)
├── lib/                     # API client (api.ts), utilities (utils.ts)
├── pages/                   # All page components
│   ├── ecommerce/           # Storefront pages (ShopPage, CartPage, Checkout, etc.)
│   ├── Categories.tsx
│   ├── CreateInvoice.tsx
│   ├── Customers.tsx
│   ├── Dashboard.tsx
│   ├── Invoices.tsx
│   ├── Login.tsx
│   ├── ProductLabels.tsx
│   ├── Products.tsx
│   ├── Reports.tsx
│   ├── Settings.tsx
│   ├── StorefrontSettings.tsx
│   ├── Subscribers.tsx
│   └── Suppliers.tsx
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```

---

## 🖧 Backend Folder Structure

```
backend/
├── prisma/
│   └── schema.prisma         ← Data models (MySQL)
├── src/
│   ├── index.ts              ← Express app init, CORS, routes, Socket.IO
│   ├── lib/
│   │   ├── prisma.ts         ← Prisma client singleton
│   │   └── socket.ts         ← Socket.IO singleton
│   ├── middleware/
│   │   └── auth.ts           ← JWT auth middleware
│   ├── routes/
│   │   └── (to be added)     ← API route modules
│   └── utils/
│       └── (to be added)     ← Utility helpers
├── public/
│   └── uploads/              ← Static file storage
├── package.json
├── tsconfig.json
├── .env / .env.example
└── render.yaml               ← Deploy config
```

---

## 🌐 API Endpoints (Implemented)

All endpoints prefixed with `/api/`.

**Standard response format:** `{ success: boolean, data?: any, error?: string }`

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/health` | Health check | ✅ Live |
| POST | `/api/auth/login` | Staff login (JWT) | ✅ Live |
| GET | `/api/foods` | Fetch all food items with categories | ✅ Live |
| GET | `/api/categories?type=FOOD\|INVENTORY` | List categories (filtered by type) | ✅ Live |
| POST | `/api/categories` | Create category (body: `{ name, type }`) | ✅ Live |
| PUT | `/api/categories/:id` | Update category name | ✅ Live |
| DELETE | `/api/categories/:id` | Delete category (blocked if referenced) | ✅ Live |
| GET | `/api/units` | List all units | ✅ Live |
| POST | `/api/units` | Create unit (body: `{ name, abbreviation }`) | ✅ Live |
| PUT | `/api/units/:id` | Update unit name/abbreviation | ✅ Live |
| DELETE | `/api/units/:id` | Delete unit (blocked if referenced) | ✅ Live |
| GET/POST/PUT/DELETE | `/api/menu-items` | Menu items CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/orders` | Orders CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/invoices` | Invoices CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/customers` | Customers CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/tables` | Table management CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/inventory` | Inventory CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/settings` | Settings CRUD | 🔜 Planned |
| GET | `/api/dashboard` | Dashboard statistics | 🔜 Planned |
| GET | `/api/reports` | Reports data | 🔜 Planned |

---

## 🔗 Frontend ↔ Backend Connection

- **API Client:** `frontend/src/lib/api.ts` — custom `fetch` wrapper wrapping `window.fetch`
- **Base URL:** `VITE_API_URL` environment variable (default `http://localhost:5000/api`)
- **Auth:** JWT tokens stored in client, sent via `Authorization: Bearer <token>` header
- **CORS:** Backend dynamically allows origins via `FRONTEND_URL` env var
- **Response Format:** All endpoints respond with `{ success: boolean, data?: any, error?: string }`

## 📊 Master Data Data Flow

```
MasterDataPage (React)
  │  useEffect → fetchAll()
  ▼
useMasterDataStore (Zustand)
  │  API calls via frontend/src/lib/api.ts
  ▼
Express Routes (backend):
  ├── GET/POST    /api/categories?type=FOOD|INVENTORY
  ├── PUT/DELETE  /api/categories/:id
  ├── GET/POST    /api/units
  └── PUT/DELETE  /api/units/:id
  │
  ▼
Prisma Client (backend/src/lib/prisma.ts)
  │  Adapter: @prisma/adapter-mariadb
  ▼
MySQL Database (senari_db)
  └── categories table (id, name, type, createdAt)
  └── units table (id, name, abbreviation, createdAt)
```

**Key patterns:**
- Frontend stores only **name strings** in Zustand (persisted to localStorage for offline recovery)
- Backend owns ID references — rename/delete operations first fetch the ID by name
- Add operations optimistically update the local list on success
- Delete is blocked server-side if the category/unit is referenced by other records (food_items, inventory_items)

---

## 🌐 Full Route Tree (Frontend)

```
/ → MainWebLayout
│   (Navbar: Home · Menu · About · Contact | ThemeToggle · CartButton · Hamburger)
│   (Footer: © 2026 NebulaInfinite Software Solutions)
│   (SlideCart: slide-over from right, z-50)
│   (FloatingActionButtons: WhatsApp + ScrollTop, z-40, bottom-right)
│
├── /              → HomePage
├── /menu          → MenuPage          ✅ URL-synced filters
├── /menu/:id      → ProductViewPage   ✅ Detail + suggestions
├── /about         → AboutPage         ✅
├── /contact       → ContactPage       ✅
├── /cart          → placeholder
├── /checkout      → CheckoutPage      ✅
└── /order-success → OrderSuccessPage  ✅

/pos/login → StaffLoginPage  ✅ (public, no auth required)
  PIN pad: 3 staff cards (Admin/Cashier/Nimal), 4-dot display, shake on wrong PIN,
  auto-submit on 4th digit, keyboard (0–9, Backspace, Escape, Enter),
  redirects to intended route via location.state.from after login

/pos → POSLayout  ✅ (ProtectedRoute — redirects to /pos/login if not authenticated)
│   Sidebar: collapsible w-64↔w-20, theme-aware, live clock in header
│   Nav: Dashboard · Live Orders · Invoices · Foods · Tables · Customers · Reports · Quick Invoice · Settings
│   Footer: "View Live Website" Globe · staff name/role/avatar · LogOut button
│
├── /pos/dashboard  → POSDashboardPage  ✅
├── /pos/orders     → LiveOrdersPage    ✅ Kanban (Pending/Preparing/Ready), 8/page
├── /pos/invoices   → InvoicesPage      ✅ CRUD, thermal receipt preview, navigate to QuickPOS for add/edit
├── /pos/foods      → FoodsListPage     ✅ Table, filters, 8/page
├── /pos/foods/add  → FoodFormPage      ✅
├── /pos/foods/edit/:id → FoodFormPage  ✅
├── /pos/tables     → TableManagementPage ✅ Grid+list, click-to-cycle status, CRUD
├── /pos/customers  → CustomersPage     ✅ Enterprise CRM, reminder system, history
├── /pos/reports    → ReportsPage       ✅ KPIs, charts, heatmap
└── /pos/settings   → SettingsPage      ✅ 4 tabs

/pos/quick → QuickPOSPage  ✅ (ProtectedRoute, full-screen, no POSLayout wrapper)
```

---

## 🚀 Deployment

```
Frontend:
  Platform:     Vercel
  Build cmd:    cd frontend && npm run build
  Output dir:   frontend/dist/
  SPA routing:  vercel.json → rewrites all paths to /index.html

Backend:
  Platform:     Render.com (or VPS)
  Build cmd:    cd backend && npm install && npm run build
  Start cmd:    cd backend && npm run start
  Port:         5000 (or as configured via PORT env)
```

---

## ✅ UI/UX Audit History

| Sprint | Component | Issue | Fix |
|--------|-----------|-------|-----|
| 6 | `SlideCart` | Overflow on tiny screens | `w-[min(100vw,24rem)]` ✅ |
| 6 | `CheckoutPage` | No date picker | Date + Time `sm:grid-cols-2` ✅ |
| 6 | `CheckoutPage` | Native pickers unstyled in dark | `dark:[color-scheme:dark]` ✅ |
| 7 | `MainWebLayout` | Mobile menu too short | `max-h-72` → `max-h-80` ✅ |
| 8 | `MainWebLayout` | Slide-down replaced | Left-side `MobileDrawer` ✅ |
| 8 | `MainWebLayout` | Horizontal scroll from drawer | `overflow-x-hidden` on root ✅ |
| 9 | `MenuPage` | Filter bar scrollbar visible | `hide-scrollbar` CSS utility ✅ |
| 9 | `FoodCard` | Add button triggered Link nav | `e.preventDefault + e.stopPropagation` ✅ |
| 10 | `ListItem` | Button text too wide on mobile | "Add" on `< sm` ✅ |
| 11 | `MenuPage` | Grid too wide inside 3-col area | `lg:grid-cols-3` ✅ |
| 11 | `MenuPage` | Filter changes didn't reset page | All setters call `resetPage()` ✅ |
| 12 | `FloatingActionButtons` | Could overlap SlideCart | FABs `z-40`, SlideCart `z-50` ✅ |
| 12 | `MenuPage` | State lost on refresh | `useSearchParams` ✅ |
| 13 | `MenuPage` | Price filter drops to 0 | `searchParams.has('price')` guard ✅ |
| 13 | `MenuPage` | Native select outdated | `ModernSelect` ✅ |
| 13 | `MenuPage` | Filter changes snap | `AnimatePresence mode="popLayout"` ✅ |
| 14 | `CheckoutPage` | `OrderTypeToggle` forces 2-col mobile | `grid-cols-1 sm:grid-cols-2` ✅ |
| 14 | `CheckoutPage` | Discount input overflows | `flex-col sm:flex-row`, `w-full sm:w-44` ✅ |
| 14 | `CheckoutPage` | Discount not passed to success page | Added to `navigate()` state ✅ |
| 14 | `OrderSuccessPage` | Discount/total not shown | Added conditional InfoRows ✅ |
| 15 | `POSDashboardPage` | Bar chart clips on mobile | `overflow-x-auto` + `pl-10` offset ✅ |
| 15 | `POSDashboardPage` | Tooltip z-index stacking | `absolute z-10` on tooltip div ✅ |
| 15 | `POSDashboardPage` | Status badges low contrast | `bg-*/10 text-* border border-*/20` pattern ✅ |
| 15 | `MainWebLayout` | POS link hidden on mobile | `hidden md:flex` — intentional (mobile drawer has cart) ✅ |
| 16 | `POSLayout` | Sidebar always dark in light mode | Full theme-aware classes on sidebar + header ✅ |
| 16 | `POSLayout` | No collapse on desktop | `isSidebarCollapsed` state, `w-64`↔`w-20` transition ✅ |
| 16 | `LiveOrdersPage` | Kanban stacks on mobile | `grid-cols-1 md:grid-cols-3` ✅ |
| 17 | `LiveOrdersPage` | OrderCards flat/low contrast | `bg-amber-50 dark:bg-gray-800 shadow-md hover:-translate-y-0.5` ✅ |
| 17 | `MenuManagementPage` | Table overflows on mobile | `overflow-x-auto min-w-[700px]` ✅ |
| 17 | `MenuManagementPage` | Modal behind POSLayout header | `fixed inset-0 z-50 backdrop-blur-sm` ✅ |
| 17 | `MenuManagementPage` | Native select in modal | Acceptable for internal admin tool (no customer-facing) ✅ |
| 18 | `POSDashboardPage` | MetricCards inconsistent with OrderCards | `bg-amber-50 dark:bg-gray-800 border-amber-100 dark:border-gray-700 shadow-md` ✅ |
| 18 | `SettingsPage` | Time inputs unstyled in dark mode | `dark:[color-scheme:dark]` on all time inputs ✅ |
| 18 | `SettingsPage` | Tab rail overflows on mobile | `flex-row overflow-x-auto hide-scrollbar` → `md:flex-col` ✅ |
| 18 | `SettingsPage` | Dark mode toggle disconnected | Wired to real `useTheme()` / `toggleTheme()` ✅ |
| 19 | `FoodsListPage` | Table overflows on mobile | `overflow-x-auto min-w-[680px]` ✅ |
| 19 | `FoodsListPage` | Delete modal z-index | `fixed inset-0 z-50 bg-black/70 backdrop-blur-sm` ✅ |
| 19 | `FoodFormPage` | Form 2-col clips on small screens | `grid-cols-1 lg:grid-cols-2` stacks cleanly ✅ |
| 19 | `FoodFormPage` | Category uses native select | `ModernSelect` per RULES.md ✅ |
| 19 | `FoodFormPage` | Image URL vs upload conflict | URL input hidden when data: URI present ✅ |
| 20 | `SearchableSelect` | Dropdown clipped by overflow:hidden | `z-[200]` on dropdown div ✅ |
| 20 | `FoodFormPage` | Large images slow the form | Canvas compression maxDim=1200 quality=0.82 ✅ |
| 20 | `FoodFormPage` | No paste support | Global `document.addEventListener('paste')` in useEffect ✅ |
| 20 | `LiveOrdersPage` | No way to find specific order | Search bar (order ID + customer name) ✅ |
| 20 | `LiveOrdersPage` | Columns overflow with many orders | 8-per-page `ColumnPager` with page clamp ✅ |
| 20 | `LiveOrdersPage` | Filter state stale after advance | `useMemo` recomputes on every `orders` change ✅ |
| 21 | `FoodsListPage` | No price filtering | Price Range SearchableSelect (5 bands) ✅ |
| 21 | `FoodsListPage` | No new-items filter | Sparkles toggle button, amber active state ✅ |
| 21 | `FoodsListPage` | No table pagination | 8-per-page TablePager, page clamps on filter ✅ |
| 21 | `InvoicesPage` | Modal overflows on small screens | `max-h-[90vh] flex flex-col overflow-hidden` + scrollable body ✅ |
| 21 | `InvoicesPage` | Table overflows on mobile | `overflow-x-auto min-w-[700px]` ✅ |
| 22 | `InvoicesPage` | No create/edit/delete | `InvoiceFormModal` wizard + `DeleteModal` ✅ |
| 22 | `InvoiceFormModal` | Edit mode needs pre-fill | `initialOrder` prop seeds all 3 step states ✅ |
| 22 | `InvoicesPage` | Old TablePager replaced | `ModernPagination` — orange→red gradient, smart ellipsis ✅ |
| 22 | `FoodsListPage` | Old TablePager replaced | `ModernPagination` — consistent with Invoices ✅ |
| 22 | `InvoicesPage` + `FoodsListPage` | All filters always visible | "More Options" expandable row (max-h CSS transition) ✅ |
| 22 | `DeleteModal` (Invoices) | z-index below InvoiceFormModal | `z-[60]` — above InvoiceModal `z-50` ✅ |
| 23 | `QuickPOSPage` | Tablet: grid too wide with cart | `grid-cols-2 sm:grid-cols-3` + cart `minWidth:260px` ✅ |
| 23 | `QuickPOSPage` | Mobile: no cart access | Bottom-sheet `MobileCartDrawer` + FAB with badge ✅ |
| 23 | `QuickPOSPage` | Mobile: category overflow | Horizontal `MobileCategoryBar` with `overflow-x-auto` ✅ |
| 23 | `ThermalReceipt` | Popup blocked silently | `try/catch` restores cart + shows red error toast ✅ |
| 23 | `ThermalReceipt` | Print dialog leaves popup open | `onafterprint` closes popup; 30s timeout fallback ✅ |
| 23 | `CartPanel` | No feedback during print | Spinner + "Processing…" replaces button text while `isPaying` ✅ |
| 24 | `QuickPOSPage` | All items rendered at once (no pagination) | `ITEMS_PER_PAGE=15`, `currentPage` state, `paginatedItems` slice, `ModernPagination` pinned below grid ✅ |
| 24 | `QuickPOSPage` | F8/F9 refs not wired to inputs | `discountInputRef` → discount `<input>`, `customerCashInputRef` → cash `<input>` ✅ |
| 25 | `POSLayout` + `StaffLoginPage` | Copyright said "NebulaInfinite Software Solutions" | Updated to `© 2026 Senari Chinese Hotel` ✅ |
| 25 | `QuickPOSPage` | No way to discover F-key shortcuts | F1 → `KeyboardShortcutsModal` (dark gradient, kbd chips, 7 shortcuts); "Shortcuts / F1" button in TopBar ✅ |
| 28 | `QuickPOSPage` | Tax/service charge not applied | `useSettingsStore` wired: `effectiveTaxRate` + `effectiveServiceRate` shown in CartPanel totals and printed on receipt ✅ |
| 28 | `QuickPOSPage` | Default order/discount type ignored | `orderType` init from `defaultOrderType`; `discountType` init from `defaultDiscountType` ✅ |
| 28 | `QuickPOSPage` | No max discount enforcement | `maxDiscountPercent` cap applied in `handlePay`; amber warning in `OrderDetailsStrip` when exceeded ✅ |
| 28 | `ThermalReceipt` | No tax/service charge lines | Tax + Service Charge rows added to totals block (conditional on amount > 0) ✅ |