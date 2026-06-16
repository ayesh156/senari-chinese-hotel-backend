# 🏗️ Senari Chinese Hotel — Application Architecture

> **Last updated:** June 16, 2026 — QA Build Verified + Full Documentation Update
>
> **Business Logic:** Order Ahead for Pick-up or Dine-in only. No home delivery. Pay at Counter.
>
> **Deployment:** Frontend → Vercel SPA / Backend → Render (or VPS)

---

## 🏛️ Full-Stack Monorepo Architecture

```
senari-chinese-hotel/
├── frontend/                           ← React + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                     ← Reusable UI (SearchableSelect, ModernPagination, ReceiptModal, etc.)
│   │   │   └── pos/                    ← POS-specific components
│   │   │       └── ReceiptModal.jsx    ← Shared 80mm thermal receipt preview
│   │   ├── pages/pos/                  ← All POS pages
│   │   ├── utils/                      ← Zustand stores (cartStore, foodStore, invoiceStore, etc.)
│   │   └── routes/index.jsx            ← Route definitions
│   ├── dist/                           ← Vite production build output
│   └── vercel.json
│
├── backend/
│   ├── src/
│   │   ├── index.ts                    ← Express entry (CORS, static /uploads)
│   │   ├── routes/
│   │   │   ├── index.ts                ← Route aggregator
│   │   │   ├── order.routes.ts         ← GET/POST/DELETE /api/orders
│   │   │   ├── food.routes.ts          ← CRUD /api/foods (Multer upload)
│   │   │   ├── category.routes.ts      ← CRUD /api/categories
│   │   │   ├── unit.routes.ts          ← CRUD /api/units
│   │   │   └── auth.routes.ts          ← POST /api/auth/login
│   │   └── lib/prisma.ts               ← Prisma client singleton
│   ├── prisma/
│   │   ├── schema.prisma               ← 11 models + 7 enums (MySQL)
│   │   └── seed.ts                     ← Sample data (categories, foods, units)
│   └── public/uploads/foods/           ← Multer-stored food images
│
├── ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── README.md
├── RULES.md
├── WORKSPACE.md
└── .gitignore
```

---

## 🖧 Backend Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (TypeScript) |
| Framework | Express.js v5 |
| ORM | Prisma 7 |
| Database | MySQL |
| File Uploads | Multer (disk storage, 5 MB limit, image filter) |
| Dev Runner | ts-node-dev (hot-reload) |
| Deployment | Render.com (or VPS) |

---

## 🌐 API Endpoints

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/health` | Health check | ✅ Live |
| POST | `/api/auth/login` | Staff login (JWT) | ✅ Live |
| GET | `/api/foods` | List food items (with category) | ✅ Live |
| POST | `/api/foods` | Create food (multipart/form-data) | ✅ Live |
| PUT | `/api/foods/:id` | Update food (multipart/form-data) | ✅ Live |
| DELETE | `/api/foods/:id` | Delete food + removes image | ✅ Live |
| GET | `/api/categories?type=` | List categories filtered by type | ✅ Live |
| POST | `/api/categories` | Create category | ✅ Live |
| PUT | `/api/categories/:id` | Update category | ✅ Live |
| DELETE | `/api/categories/:id` | Delete (blocked if referenced) | ✅ Live |
| GET | `/api/units` | List units | ✅ Live |
| POST | `/api/units` | Create unit | ✅ Live |
| PUT | `/api/units/:id` | Update unit | ✅ Live |
| DELETE | `/api/units/:id` | Delete (blocked if referenced) | ✅ Live |
| **GET** | `/api/orders` | List orders (newest first) | ✅ Live |
| **POST** | `/api/orders` | Create order with items (transaction) | ✅ Live |
| **DELETE** | `/api/orders/:id` | Delete order (cascade items first) | ✅ Live |

---

## 📊 Order Checkout Flow (Transaction)

```
QuickPOSPage → handlePay
  → submitOrder({ orderType, invoiceNumber, customerName })
    → fetch POST /api/orders
      → order.routes.ts
        → 1. validate body
        → 2. generateUniqueInvoiceNumber() ← while loop + DB uniqueness check
        → 3. prisma.$transaction(async (tx) => {
             tx.order.create({ data: { ..., items: { create: [...] } } })
           })
        → 4. return created order with items
      → response 201 { success: true, data: order }
    → setCompletedOrder(order) ← triggers ReceiptModal
    → clearCart()
```

### Enterprise Invoice Number Generator
```typescript
async function generateUniqueInvoiceNumber(): Promise<string> {
  let isUnique = false;
  let newInvoiceNumber = '';
  while (!isUnique) {
    const random6 = Math.floor(100000 + Math.random() * 900000);
    newInvoiceNumber = `INV${random6}`;
    const existing = await prisma.order.findUnique({
      where: { invoiceNumber: newInvoiceNumber }
    });
    if (!existing) isUnique = true;
  }
  return newInvoiceNumber;
}
```
Format: `INV` + 6 random digits (e.g., `INV582910`). Zero duplicates guaranteed.

### Order Delete (Safe Cascade)
```typescript
await prisma.$transaction([
  prisma.orderItem.deleteMany({ where: { orderId: id } }),
  prisma.order.delete({ where: { id } }),
]);
```
Deletes child `order_items` before parent `orders` to prevent FK violations.

---

## 🖼️ Image Architecture

### Upload Flow
1. User selects file in FoodFormPage → compressed via `canvas.toBlob('image/webp', 0.8)`
2. Wrapped as `File` object → appended to `FormData` as `image` field
3. Multer saves to `backend/public/uploads/foods/food-{timestamp}-{random}.{ext}`
4. DB stores relative path: `/uploads/foods/food-1718399000000-12345.jpg`
5. Served via `express.static` at `http://localhost:5000/uploads/foods/...`

### Frontend URL Helper
```javascript
const getFullImageUrl = (path) => {
  if (!path) return null;                          // → show Utensils placeholder
  if (path.startsWith('http')) return path;         // → absolute URL, use as-is
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;                 // → http://localhost:5000/uploads/foods/...
};
```
`API_BASE` strips `/api` from `VITE_API_URL`: `http://localhost:5000/api` → `http://localhost:5000`.

---

## 🧾 Receipt Modal Architecture

**Shared component:** `frontend/src/components/pos/ReceiptModal.jsx`

```
Props: { isOpen: boolean, onClose: () => void, order: object }
```

Used by both:
- `QuickPOSPage` — auto-opens after successful payment (`setCompletedOrder(result)`)
- `InvoicesPage` — opens when user clicks View on an invoice (`setActiveInvoice(order)`)

**Styling rules:**
- Outer container: `bg-gray-100 dark:bg-gray-800` (theme-responsive background)
- Receipt paper: `bg-white text-black font-mono` (always white like physical paper)
- All text on paper uses `text-black` with opacity variants (`text-black/60`, `text-black/50`) — no Tailwind gray palette
- Borders: `border-black/20` (black with opacity, unaffected by dark mode)

---

## Key Design Decisions

1. **No tax/service charge** — Total = Subtotal − Discount (restaurant business requirement)
2. **All orders are COMPLETED + PAID** — QuickPOS is a "pay & print" system, no order lifecycle
3. **Customer name stored in `notes` JSON** — Not a separate field, since QuickPOS doesn't manage a customer database
4. **Native fetch for all stores** — The `api.ts` wrapper is only used for auth. All data stores (`foodStore`, `cartStore`, `invoiceStore`) use native `fetch` + bulletproof extraction
5. **Prisma transactions** — All order operations (create + items, delete + items) use `$transaction` for atomicity
6. **Collision-proof invoice numbers** — Generated server-side with a DB uniqueness check loop