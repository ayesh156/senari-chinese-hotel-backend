# 🏗️ Senari Chinese Hotel — Application Architecture

> **Last updated:** June 15, 2026 — Food Items Full-Stack CRUD with Multer file uploads
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
├── backend/                            ← Express + Prisma + MySQL API
│   ├── prisma/
│   │   └── schema.prisma               ← Data models (MySQL)
│   ├── src/
│   │   ├── index.ts                    ← Express entry point (CORS, static serve, health check)
│   │   ├── lib/
│   │   │   └── prisma.ts               ← Prisma client singleton
│   │   ├── middleware/
│   │   │   └── auth.ts                 ← JWT auth middleware (planned)
│   │   ├── routes/
│   │   │   ├── index.ts                ← Route aggregator
│   │   │   ├── auth.routes.ts          ← POST /api/auth/login
│   │   │   ├── food.routes.ts          ← CRUD /api/foods (Multer file upload)
│   │   │   ├── category.routes.ts      ← CRUD /api/categories
│   │   │   └── unit.routes.ts          ← CRUD /api/units
│   │   └── utils/
│   ├── public/
│   │   └── uploads/
│   │       └── foods/                  ← Uploaded food images
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── .env.example
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
| File Uploads | Multer (disk storage, 5 MB limit, image filter) |
| Dev Runner | ts-node-dev (hot-reload) |
| Deployment | Render.com (or VPS) |

---

## 🌐 API Endpoints (Implemented)

All endpoints prefixed with `/api/`.

**Standard response format:** `{ success: boolean, data?: any, error?: string }`

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/health` | Health check | ✅ Live |
| POST | `/api/auth/login` | Staff login (JWT) | ✅ Live |
| GET | `/api/foods` | Fetch all food items with categories (newest first) | ✅ Live |
| GET | `/api/foods/:id` | Fetch single food item for editing | ✅ Live |
| POST | `/api/foods` | Create food item — `multipart/form-data` | ✅ Live |
| PUT | `/api/foods/:id` | Update food item — `multipart/form-data` | ✅ Live |
| DELETE | `/api/foods/:id` | Delete food item + removes image from disk | ✅ Live |
| GET | `/api/categories?type=FOOD\|INVENTORY` | List categories (filtered by type) | ✅ Live |
| POST | `/api/categories` | Create category (body: `{ name, type }`) | ✅ Live |
| PUT | `/api/categories/:id` | Update category name | ✅ Live |
| DELETE | `/api/categories/:id` | Delete category (blocked if referenced) | ✅ Live |
| GET | `/api/units` | List all units | ✅ Live |
| POST | `/api/units` | Create unit (body: `{ name, abbreviation }`) | ✅ Live |
| PUT | `/api/units/:id` | Update unit name/abbreviation | ✅ Live |
| DELETE | `/api/units/:id` | Delete unit (blocked if referenced) | ✅ Live |
| GET/POST/PUT/DELETE | `/api/orders` | Orders CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/invoices` | Invoices CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/customers` | Customers CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/tables` | Table management CRUD | 🔜 Planned |
| GET/POST/PUT/DELETE | `/api/inventory` | Inventory CRUD | 🔜 Planned |

### Food API — `multipart/form-data` Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | ✅ | Food item name |
| `price` | number | ✅ | Price in LKR |
| `categoryId` | number | ✅ | Integer ID of food category |
| `description` | string | | Free-text description |
| `isAvailable` | boolean | | Defaults to `true` |
| `image` | File | | Uploaded image file (jpg, jpeg, png, gif, webp). Max 5 MB |

---

## 🔗 Frontend ↔ Backend Connection

- **API Client:** `frontend/src/lib/api.ts` — custom `fetch` wrapper
- **Base URL:** `VITE_API_URL` environment variable (default `http://localhost:5000/api`)
- **Auth:** JWT tokens stored in client, sent via `Authorization: Bearer <token>` header
- **CORS:** Backend dynamically allows origins via `FRONTEND_URL` env var
- **File Uploads:** `multipart/form-data` via `FormData` — the `api.ts` client skips `Content-Type` header for `FormData` (browser sets boundary automatically)
- **Response Format:** All endpoints respond with `{ success: boolean, data?: any, error?: string }`
- **Database Seeding:** Run `npx prisma db seed` inside `backend/` to populate the database with sample data (admin user, categories, food items, units). The seed script is configured in `package.json` as `"prisma": { "seed": "ts-node prisma/seed.ts" }`.

---

## 📊 Food Items Data Flow

```
FoodFormPage (React)
  │  Constructs FormData with text fields + image File
  │  POST / PUT to /api/foods via native fetch (not api.ts helper)
  ▼
Express Routes (backend/src/routes/food.routes.ts)
  │  upload.single('image') → Multer saves to public/uploads/foods/
  │  parseFormBody() → casts strings to numbers/booleans
  ▼
Prisma Client → MySQL
  └── food_items table (name, price, description, categoryId, isAvailable, image path)
```

**Image storage:**
- Files stored at: `backend/public/uploads/foods/food-{timestamp}-{random}.{ext}`
- Served via: `http://localhost:5000/uploads/foods/filename.jpg`
- DB stores relative path: `/uploads/foods/filename.jpg`
- On DELETE, the image file is also removed from disk