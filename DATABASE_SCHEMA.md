# 🗄️ Senari Chinese Hotel — Database Schema Reference

> **Last updated:** June 12, 2026 — Phase 2: Complete Prisma/MySQL schema designed from frontend mock data

---

## 🏛️ Entity Relationship Diagram

```
User ──< Order                                  (Staff processes order)
       │
Category ──< FoodItem                           (Menu categories, e.g. "Street Food")
Category ──< InventoryItem                      (Inventory categories, e.g. "Meat")
       │
Unit ──< InventoryItem                          (Measurement units, e.g. "kg", "liters")
       │
FoodItem ──< OrderItem ──> Order                (What was ordered)
Order ──< Customer                              (Who ordered)
Order ──< RestaurantTable                       (Where they sit)
       │
Supplier ──< PurchaseOrder                      (Inventory restocking)
InventoryItem ──< PurchaseOrderItem ──> PurchaseOrder
InventoryItem ──< InventoryAdjustment           (Stock change log)
```

---

## 📦 Enums

### `UserRole`
| Value | Description |
|-------|-------------|
| `ADMIN` | Full system access |
| `CASHIER` | POS operations only |
| `STAFF` | Kitchen/limited view |

### `CategoryType`
| Value | Description |
|-------|-------------|
| `FOOD` | Menu item category (e.g., "Rice Dishes", "Desserts") |
| `INVENTORY` | Inventory item category (e.g., "Meat", "Spices") |

### `OrderType`
| Value | Description |
|-------|-------------|
| `DINE_IN` | Customer eats at restaurant |
| `TAKEAWAY` | Customer picks up order |
| `DELIVERY` | Delivered to customer (future) |

### `OrderStatus`
| Value | Description |
|-------|-------------|
| `PENDING` | New order, not yet being prepared |
| `PREPARING` | Kitchen is actively preparing |
| `READY` | Prepared, awaiting pickup/service |
| `COMPLETED` | Fully delivered and closed |
| `CANCELLED` | Order voided |

### `PaymentStatus`
| Value | Description |
|-------|-------------|
| `UNPAID` | Awaiting payment |
| `PAID` | Fully paid |
| `PARTIAL` | Partial payment received |

### `TableStatus`
| Value | Description |
|-------|-------------|
| `AVAILABLE` | Table is free |
| `OCCUPIED` | Table is in use by customers |
| `RESERVED` | Table is reserved for future |

### `POStatus`
| Value | Description |
|-------|-------------|
| `PAID` | Purchase order fully paid to supplier |
| `UNPAID` | Purchase order not yet paid |
| `PARTIAL` | Partially paid to supplier |

---

## 🗄️ Models

### User (`users`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| name | String | required | Staff full name |
| email | String? | unique | Login identifier |
| phone | String? | optional | |
| password | String | default: "" | Hashed with bcryptjs |
| role | UserRole | default: STAFF | ADMIN, CASHIER, or STAFF |
| active | Boolean | default: true | Soft deactivation |
| createdAt | DateTime | auto | |

**Relationships:** `orders Order[]`

---

### Category (`categories`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| name | String | **unique** | "Street Food", "Meat", etc. |
| type | CategoryType | required | FOOD or INVENTORY |
| createdAt | DateTime | auto | |

**Relationships:**
- `foodItems FoodItem[]` — named relation "FoodCategory"
- `inventoryItems InventoryItem[]` — named relation "InventoryCategory"

---

### Unit (`units`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| name | String | **unique** | "Kilogram", "Liter" |
| abbreviation | String | required | "kg", "L", "pcs" |
| createdAt | DateTime | auto | |

**Relationships:** `inventoryItems InventoryItem[]`

---

### FoodItem (`food_items`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| name | String | required | "Chicken Kottu" |
| price | Decimal(10,2) | required | LKR |
| categoryId | Int | FK → categories.id | |
| category | Category | relation | "FoodCategory" |
| description | Text? | optional | Full description |
| ingredients | Text? | optional | JSON array stored as text |
| image | String? | optional | URL or base64 |
| calories | Int? | optional | |
| prepTime | String? | optional | "15 min" |
| isNew | Boolean | default: false | Shows "NEW" badge |
| isAvailable | Boolean | default: true | Can be ordered |
| sortOrder | Int | default: 0 | Manual ordering priority |
| createdAt | DateTime | auto | |
| updatedAt | DateTime | auto | |

**Relationships:** `orderItems OrderItem[]`

---

### InventoryItem (`inventory_items`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| sku | String | **unique** | "GRN-001" |
| name | String | required | "Basmati Rice" |
| categoryId | Int | FK → categories.id | |
| category | Category | relation | "InventoryCategory" |
| quantity | Decimal(10,2) | required | Current stock |
| unitId | Int | FK → units.id | |
| unit | Unit | relation | |
| minAlertLevel | Decimal(10,2) | default: 0 | Low-stock threshold |
| unitPrice | Decimal(10,2) | required | Cost per unit |
| createdAt | DateTime | auto | |
| updatedAt | DateTime | auto | |

**Relationships:**
- `purchaseOrderItems PurchaseOrderItem[]`
- `adjustments InventoryAdjustment[]`

---

### Customer (`customers`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| name | String | required | |
| phone | String | **unique** | Primary identifier |
| email | String? | optional | |
| address | Text? | optional | |
| nic | String? | optional | National ID card number |
| image | String? | optional | Avatar URL or base64 |
| dueAmount | Decimal(10,2) | default: 0 | Outstanding balance |
| reminderCount | Int | default: 0 | Number of reminders sent |
| createdAt | DateTime | auto | |
| updatedAt | DateTime | auto | |

**Relationships:** `orders Order[]`

---

### Supplier (`suppliers`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| name | String | required | Company name |
| phone | String? | optional | |
| email | String? | optional | |
| address | Text? | optional | |
| category | String? | optional | Free-text: "Vegetables", "Meat", etc. |
| payableAmount | Decimal(10,2) | default: 0 | Debt owed to supplier |
| totalPurchases | Decimal(10,2) | default: 0 | Lifetime purchase volume |
| createdAt | DateTime | auto | |
| updatedAt | DateTime | auto | |

**Relationships:** `purchaseOrders PurchaseOrder[]`

---

### RestaurantTable (`restaurant_tables`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| tableNumber | Int | **unique** | "1", "2", "3" |
| capacity | Int | default: 4 | Seat count |
| status | TableStatus | default: AVAILABLE | AVAILABLE / OCCUPIED / RESERVED |
| note | Text? | optional | Staff notes |
| createdAt | DateTime | auto | |
| updatedAt | DateTime | auto | |

**Relationships:** `orders Order[]`

---

### Order (`orders`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| invoiceNumber | String | **unique** | "ORD-001", "QR-0001" |
| type | OrderType | default: DINE_IN | DINE_IN / TAKEAWAY / DELIVERY |
| status | OrderStatus | default: PENDING | PENDING → PREPARING → READY → COMPLETED |
| paymentStatus | PaymentStatus | default: UNPAID | UNPAID → PAID / PARTIAL |
| subtotal | Decimal(10,2) | required | Sum of all items before discount |
| discount | Decimal(10,2) | default: 0 | Discount amount in LKR |
| total | Decimal(10,2) | required | Final amount after discount |
| notes | Text? | optional | Staff notes |
| customerId | Int? | FK → customers.id | Null for walk-in |
| tableId | Int? | FK → restaurant_tables.id | Null for takeaway |
| userId | Int? | FK → users.id | Cashier who processed |
| createdAt | DateTime | auto | |
| updatedAt | DateTime | auto | |

**Relationships:**
- `customer Customer?`
- `table RestaurantTable?`
- `user User?`
- `items OrderItem[]`

---

### OrderItem (`order_items`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| orderId | Int | FK → orders.id, **CASCADE DELETE** | |
| foodId | Int | FK → food_items.id | |
| quantity | Int | default: 1 | |
| unitPrice | Decimal(10,2) | required | Price snapshot at order time |
| subtotal | Decimal(10,2) | required | quantity × unitPrice |

**Relationships:**
- `order Order` — cascade delete when order is deleted
- `food FoodItem`

---

### PurchaseOrder (`purchase_orders`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| poNumber | String | **unique** | "PO-0001" |
| supplierId | Int | FK → suppliers.id | |
| supplier | Supplier | relation | |
| subtotal | Decimal(10,2) | required | Total before payments |
| paidAmount | Decimal(10,2) | default: 0 | Amount paid so far |
| paymentStatus | POStatus | default: UNPAID | |
| notes | Text? | optional | |
| receivedAt | DateTime? | nullable | When goods were received |
| createdAt | DateTime | auto | |
| updatedAt | DateTime | auto | |

**Relationships:** `items PurchaseOrderItem[]`

---

### PurchaseOrderItem (`purchase_order_items`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| purchaseOrderId | Int | FK → purchase_orders.id, **CASCADE DELETE** | |
| inventoryItemId | Int | FK → inventory_items.id | |
| quantity | Decimal(10,2) | required | |
| unitPrice | Decimal(10,2) | required | |
| total | Decimal(10,2) | required | quantity × unitPrice |

**Relationships:**
- `purchaseOrder PurchaseOrder` — cascade delete
- `inventoryItem InventoryItem`

---

### InventoryAdjustment (`inventory_adjustments`)
| Column | Type | Attributes | Notes |
|--------|------|------------|-------|
| id | Int | PK, autoincrement | |
| inventoryItemId | Int | FK → inventory_items.id | |
| adjustmentType | String | required | "New Delivery", "Daily Usage", "Damage/Waste", "Count Correction", "Other" |
| quantity | Decimal(10,2) | required | Positive = addition, Negative = reduction |
| previousStock | Decimal(10,2) | required | Stock before adjustment |
| newStock | Decimal(10,2) | required | Stock after adjustment |
| notes | Text? | optional | |
| createdAt | DateTime | auto | |

---

## 🔑 Key Business Rules

| Rule | Implementation |
|------|---------------|
| **No delivery address** | `Order` has no `deliveryAddress` field — pickup/dine-in only |
| **Pay at counter** | `Order.paymentStatus` defaults to UNPAID until staff confirms |
| **Price snapshot on orders** | `OrderItem.unitPrice` stores the price at time of order (not FK to FoodItem) |
| **Discount cap** | Enforced at application layer via `settingsStore.maxDiscountPercent` |
| **Stock status derived** | Calculated from `quantity` vs `minAlertLevel`: `qty ≤ 0` = OUT, `qty ≤ minAlertLevel` = LOW |
| **Currency** | All monetary fields are LKR, `Decimal(10, 2)` precision |

---

## 🗺️ Frontend Mock Data → Prisma Models Mapping

| Frontend Source | Prisma Model | Notes |
|-----------------|-------------|-------|
| `menuData.js` (MENU_ITEMS) | FoodItem, Category (type: FOOD) | 22 seed items |
| `masterDataStore.foodCategories` | Category (type: FOOD) | "Street Food", "Rice Dishes" |
| `masterDataStore.inventoryCategories` | Category (type: INVENTORY) | "Meat", "Vegetables" |
| `masterDataStore.units` | Unit | "kg", "liters", "packets" |
| `inventoryData.js` (INVENTORY_ITEMS) | InventoryItem | 18 seed items |
| `mockSuppliers.js` | Supplier | 10 seed suppliers |
| `mockOrders.js` (MOCK_ORDERS) | Order, OrderItem | 30 seed orders |
| `mockOrders.js` (MOCK_TABLES) | RestaurantTable | 6 seed tables |
| `mockPurchaseOrders.js` | PurchaseOrder, PurchaseOrderItem | 7 seed POs |
| `authStore` | User | 3 staff accounts |
| `settingsStore` | Application config | Handled at app layer |
| `inventoryData.adjustments` | InventoryAdjustment | Stock change log |

---

## 📁 Related Files

| File | Purpose |
|------|---------|
| `backend/prisma/schema.prisma` | **Source of truth** — Prisma schema definitions |
| `backend/prisma/seed.ts` | Planned seed script |
| `frontend/src/utils/menuData.js` | Food seed data (22 items) |
| `frontend/src/utils/inventoryData.js` | Inventory seed + status helpers |
| `frontend/src/utils/masterDataStore.js` | Categories & units (Zustand) |
| `frontend/src/utils/settingsStore.js` | Billing & POS preferences |
| `frontend/src/utils/authStore.js` | Staff session |
| `frontend/src/utils/mockOrders.js` | Invoice/order seed (30 orders) |
| `frontend/src/utils/mockSuppliers.js` | Supplier seed data (10 suppliers) |
| `frontend/src/utils/mockPurchaseOrders.js` | Purchase order seed (7 POs) |
| `frontend/src/utils/reportAnalytics.js` | Advanced Reports KPIs, charts, food rankings |