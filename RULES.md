# 📐 Project Rules — Senari Chinese Hotel

These rules must be followed by every contributor (human or AI) on every change.

---

## 🔴 CRITICAL RULE

> **Before generating or modifying any code for components, pages, or layouts, read this file.**
> **After any significant feature addition or structural change, you MUST automatically update (without the user asking):**
> 1. `WORKSPACE.md` — sprint progress, completed tasks, and next steps
> 2. `DATABASE_SCHEMA.md` — current state shapes, stores, and planned/future models
> 3. `ARCHITECTURE.md` — component tree and project structure when routes or modules change
>
> No PR or task is considered complete until these documents reflect the new reality.

---

## 🟡 General Rules

- **Mobile-first**: All UI must be built mobile-first using Tailwind responsive prefixes (`sm:`, `md:`, `lg:`).
- **Component hygiene**: Keep components small and single-responsibility. Extract sub-components when a component exceeds ~80 lines.
- **Currency**: Display all prices in **Sri Lankan Rupees** formatted as `Rs. X,XXX`.
- **Icons**: Use `lucide-react` exclusively for all icons. Do not mix icon libraries.
- **Image fallback**: Every `<img>` tag must include an `onError` handler that sets `e.target.src` to `FALLBACK_IMAGE_URL` imported from `src/utils/constants.js`.
- **Routing**: All new pages must be registered in `src/routes/index.jsx` immediately after creation.
- **Naming**: Pages → `PascalCasePage.jsx`, Layouts → `PascalCaseLayout.jsx`, UI components → `PascalCase.jsx`.
- **No inline styles**: Use Tailwind utility classes only. No `style={{}}` props unless absolutely unavoidable.
- **Standard API response format**: All backend API responses must follow: `{ success: boolean, data?: any, error?: string }`. Success: send `data` with HTTP 2xx. Client error: send `error` with HTTP 4xx. Server error: send `error` with HTTP 500.
- **File uploads**: All file uploads must use `multipart/form-data` and Multer. Do not use Base64 strings for images. Store files on disk under `public/uploads/` and serve them via `express.static`. The database stores only the relative URL path.
- **Frontend data extraction**: Always use native `fetch` (not the `api.ts` wrapper) for `fetchAll`/list queries, then extract with the bulletproof pattern: `Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])`. This avoids issues where the `api.ts` wrapper transforms the response structure.
- **Zustand GET rule**: When writing Zustand stores for GET/`fetchAll` requests, ALWAYS use native `fetch()` instead of `api.ts` to prevent data extraction bugs. Use the bulletproof pattern: `Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : [])`.
- **Dummy data**: Keep all placeholder/dummy data co-located in the page file until a real API is connected.
- **Seed data**: Always include representative sample data in `backend/prisma/seed.ts` for every model so the UI shows meaningful records immediately after `npx prisma db seed`.
- **Dark mode**: Apply dark-mode variants (`dark:`) on all new components using the Tailwind `class` strategy.
- **Custom selects**: Never use native `<select>` for visible UI. Use `<ModernSelect />` or `<SearchableSelect />` from `src/components/ui/`.
- **URL state**: Filter/search/sort state on list pages must be stored in URL search params (`useSearchParams`) for shareability and refresh persistence.
- **Price defaults**: When reading a numeric URL param that may be absent, always use `searchParams.has(key)` before `searchParams.get(key)` to avoid defaulting to `0`.

## 🟡 Frontend-Specific Rules

- **Image URL helper**: Always use the bulletproof `getRenderUrl()` or `getFullImageUrl()` helper for frontend image `src` attributes to prevent double-slashes and missing base URLs. The helper must:
  - Return `null` for empty paths (→ show placeholder icon)
  - Return the path as-is for absolute URLs (starting with `http`)
  - Strip `/api` from `VITE_API_URL` before prepending: `(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')`
  - Ensure single leading slash: `path.startsWith('/') ? path : '/' + path`
- **Receipt components**: All printable components (like receipts) must strictly use `bg-white text-black font-mono`, explicitly overriding any dark mode themes. The background behind the receipt paper should be `bg-gray-100 dark:bg-gray-800` to visually separate the paper.
- **Image fallback without loop**: Use `useState(imgError)` pattern instead of `onError` setting `e.target.src`. When an image fails, set `setImgError(true)` which triggers a re-render showing a `<Utensils>` placeholder instead of an `<img>` tag — this prevents infinite retry loops.

## 🟡 Backend-Specific Rules

- **Invoice numbers**: Must be generated as `INV` + 6 digits (e.g., `INV582910`). Use a `while` loop that checks the database for uniqueness before committing. Never accept client-supplied invoice numbers.
- **Order deletion**: Always use `prisma.$transaction([orderItem.deleteMany, order.delete])` to safely delete child records before the parent, preventing foreign key constraint violations.
- **Order creation**: Always use `prisma.$transaction(async (tx) => { ... })` to create Order + OrderItems atomically.
- **TypeScript**: All `req.params.id` must be cast with `as string`: `parseInt(req.params.id as string, 10)`.
- **Category type filter**: Use `as any` or explicit enum cast for Prisma enum fields to avoid TypeScript errors: `{ type: typeFilter as any }`.

---

## 🟢 Workflow

1. Pick a task from `WORKSPACE.md` → move it to **In Progress**
2. Read `RULES.md` before writing any code
3. Build the feature following the rules above
4. **UI/UX & RESPONSIVENESS AUDIT**: After generating or modifying any component or page, you MUST ensure it is fully mobile-responsive (using Tailwind's `sm/md/lg` prefixes) and free of overlapping UI issues or console errors.
5. Update `ARCHITECTURE.md` when structure changes
6. Update `DATABASE_SCHEMA.md` when entities, stores, or data shapes change
7. Move the task to **Completed** in `WORKSPACE.md`
8. Commit with a clear message: `feat(web): add FoodCard component`

---

## 🔵 Deployment Rules

- **SPA routing**: `vercel.json` must contain a catch-all rewrite to `/index.html` so React Router handles all routes on Vercel.
- **Environment variables**: Never commit `.env` files. Use Vercel dashboard or `.env.example` for documentation.
- **Build command**: `npm run build` — output goes to `dist/`.
- **Navigation state**: When navigating between pages with `navigate('/path', { state })`, always pass all data the destination page needs (e.g., `discountAmount`, `grandTotal`) — never rely on re-computing from stale store state after `clearCart()`.
- **Clean builds**: Always run `npx tsc --noEmit` and `npx vite build` before marking a task complete. Fix any errors immediately.