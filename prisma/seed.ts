import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ── Clear existing data (development-safe order) ──────────────────────────
  await prisma.supplierPayment?.deleteMany?.();
  await prisma.supplierReminder?.deleteMany?.();
  await prisma.paymentRecord?.deleteMany?.();
  await prisma.reminderHistory?.deleteMany?.();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('   ✅ Cleared existing data');

  // ── Admin & Cashier Users ────────────────────────────────────────────────
  const adminHashedPassword = await bcrypt.hash('password123', 10);
  const cashierHashedPassword = await bcrypt.hash('cashierd123', 10);

  const [admin, cashier] = await Promise.all([
    // 1. System Administrator
    prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@senari.com',
        password: adminHashedPassword,
        role: 'ADMIN',
        active: true,
      },
    }),
    // 2. Cashier User
    prisma.user.create({
      data: {
        name: 'Cashier',
        email: 'cashier@senari.com',
        password: cashierHashedPassword,
        role: 'CASHIER',
        active: true,
      },
    }),
  ]);

  console.log(`   ✅ Created admin user: ${admin.email}`);
  console.log(`   ✅ Created cashier user: ${cashier.email}`);

  // ── Food Categories (Synchronized with PDF Menu) ─────────────────────────
  const foodCategoryNames = [
    'Beverages',
    'Quick Bites',
    'Soups',
    'Fried Rice',
    'Noodles',
    'Pasta & Macaroni',
    'Kottu',
    'Mains',
  ];
  const foodCategories = await Promise.all(
    foodCategoryNames.map((name) => prisma.category.create({ data: { name, type: 'FOOD' } }))
  );
  const foodCatMap = Object.fromEntries(foodCategories.map((c) => [c.name, c.id]));
  console.log(`   ✅ Created ${foodCategories.length} food categories`);

  const inventoryCategoryNames = ['Meat', 'Seafood', 'Vegetables', 'Groceries', 'Dairy', 'Spices', 'Oils', 'Packaging'];
  const inventoryCategories = await Promise.all(inventoryCategoryNames.map((name) => prisma.category.create({ data: { name, type: 'INVENTORY' } })));
  console.log(`   ✅ Created ${inventoryCategories.length} inventory categories`);

  const supplierCategoryNames = ['Groceries', 'Meat', 'Vegetables', 'Seafood', 'Dairy', 'Spices', 'Oils', 'Packaging', 'Beverages', 'Frozen Foods'];
  const supplierCategories = await Promise.all(supplierCategoryNames.map((name) => prisma.category.create({ data: { name, type: 'SUPPLIER' } })));
  console.log(`   ✅ Created ${supplierCategories.length} supplier categories`);

  // ── Units ────────────────────────────────────────────────────────────────
  const unitData = [
    { name: 'Kilogram', abbreviation: 'kg' }, { name: 'Gram', abbreviation: 'g' },
    { name: 'Liter', abbreviation: 'L' }, { name: 'Milliliter', abbreviation: 'ml' },
    { name: 'Packet', abbreviation: 'packets' }, { name: 'Tray', abbreviation: 'trays' },
    { name: 'Bottle', abbreviation: 'bottles' }, { name: 'Bunch', abbreviation: 'bunches' },
    { name: 'Can', abbreviation: 'cans' }, { name: 'Block', abbreviation: 'blocks' },
    { name: 'Portion', abbreviation: 'portions' }, { name: 'Piece', abbreviation: 'pcs' },
  ];
  const units = await Promise.all(unitData.map((u) => prisma.unit.create({ data: u })));
  console.log(`   ✅ Created ${units.length} units`);

  // ── Food Items ────────────────────────────────────────────────────────────
  // High-resolution Unsplash food image seeds with realistic nutritional data
 // ── Food Items (Extracted strictly from Senari Restaurant PDF Menu) ───────
  const foodItemsData = [
    // ── 1. Beverages: Teas & Coffees ────────────────────────────────────────
    {
      name: 'Ice Tea',
      category: 'Beverages',
      description: 'Chilled iced tea freshly brewed',
      ingredients: ['Tea', 'Ice', 'Sugar'],
    },
    {
      name: 'Tea Pot (Two Person)',
      category: 'Beverages',
      description: 'Hot brewed tea pot served for two persons',
      ingredients: ['Tea leaves', 'Hot water', 'Milk', 'Sugar'],
      serves: '2 persons',
    },
    {
      name: 'Nescafe',
      category: 'Beverages',
      description: 'Classic hot Nescafe coffee',
      ingredients: ['Nescafe coffee', 'Hot water', 'Milk', 'Sugar'],
    },
    {
      name: 'Nestea',
      category: 'Beverages',
      description: 'Flavour that warms the soul',
      ingredients: ['Nestea blend', 'Water'],
    },
    {
      name: 'Ice Coffee',
      category: 'Beverages',
      description: 'Chilled creamy iced coffee',
      ingredients: ['Coffee', 'Milk', 'Sugar', 'Ice'],
    },
    {
      name: 'Coffee Pot (Two Person)',
      category: 'Beverages',
      description: 'Freshly prepared hot coffee pot for two',
      ingredients: ['Coffee', 'Hot water', 'Milk', 'Sugar'],
      serves: '2 persons',
    },

    // ── 1. Beverages: Cool Drinks & Water ───────────────────────────────────
    { name: 'Coca Cola 400ml', category: 'Beverages', description: 'Chilled Coca Cola 400ml bottle', ingredients: ['Coca Cola'] },
    { name: 'Zero Coca Cola 400ml', category: 'Beverages', description: 'Zero sugar Coca Cola 400ml', ingredients: ['Zero Coca Cola'] },
    { name: 'Coca Cola 300ml', category: 'Beverages', description: 'Chilled Coca Cola 300ml glass bottle', ingredients: ['Coca Cola'] },
    { name: 'Sprite 400ml', category: 'Beverages', description: 'Refreshing lemon-lime Sprite 400ml', ingredients: ['Sprite'] },
    { name: 'Sprite 300ml', category: 'Beverages', description: 'Chilled Sprite 300ml glass bottle', ingredients: ['Sprite'] },
    { name: 'Lemonade 400ml', category: 'Beverages', description: 'Fizzy sweet and sour Lemonade 400ml', ingredients: ['Lemonade'] },
    { name: 'Soda 500ml', category: 'Beverages', description: 'Carbonated soda water 500ml', ingredients: ['Soda'] },
    { name: 'Soda 400ml', category: 'Beverages', description: 'Carbonated soda water 400ml', ingredients: ['Soda'] },
    { name: 'Tonic 500ml', category: 'Beverages', description: 'Classic tonic water 500ml', ingredients: ['Tonic water'] },
    { name: 'Tonic 400ml', category: 'Beverages', description: 'Classic tonic water 400ml', ingredients: ['Tonic water'] },
    { name: 'Dry Ginger Ale 400ml', category: 'Beverages', description: 'Crisp dry ginger ale 400ml', ingredients: ['Ginger ale'] },
    { name: 'Ginger Beer 400ml', category: 'Beverages', description: 'Spicy Sri Lankan ginger beer 400ml', ingredients: ['Ginger beer'] },
    { name: 'Water 1L', category: 'Beverages', description: 'Purified drinking water 1 Litre bottle', ingredients: ['Mineral water'] },
    { name: 'Water 500ml', category: 'Beverages', description: 'Purified drinking water 500ml bottle', ingredients: ['Mineral water'] },

    // ── 2. Quick Bites (First Bite) ─────────────────────────────────────────
    {
      name: 'Jumbo Sausage - Fried',
      category: 'Quick Bites',
      description: 'Fried jumbo sausage tossed with onions and green chilies',
      ingredients: ['Jumbo Sausage', 'Green Chili', 'Curry Leaves', 'Fresh Onion'],
    },
    {
      name: 'Fried Cashew Nuts / Almond and Garlic',
      category: 'Quick Bites',
      description: 'Crispy fried cashew nuts, almonds and golden garlic cloves',
      ingredients: ['Cashew Nuts', 'Almond', 'Garlic', 'Curry Leaves', 'Chili Powder', 'Salt'],
    },
    {
      name: 'Fried Garlic',
      category: 'Quick Bites',
      description: 'Whole crispy fried garlic tempered with spices',
      ingredients: ['Garlic', 'Curry Leaves', 'Chili Powder', 'Salt'],
    },
    {
      name: 'French Fries',
      category: 'Quick Bites',
      description: 'Crispy fried potato fries spiced with chili and curry leaves',
      ingredients: ['Potatoes', 'Curry Leaves', 'Chili Powder', 'Salt'],
    },
    {
      name: 'Kochchi Bite',
      category: 'Quick Bites',
      description: 'Spicy bite tossed with fiery bird’s eye chilies and creamy mayonnaise',
      ingredients: ['Fresh Onion', 'Green Chili (Kochchi)', 'Mayonnaise'],
    },
    {
      name: 'Fruit Platter',
      category: 'Quick Bites',
      description: 'Assorted seasonal fresh tropical fruit slices',
      ingredients: ['Assorted Tropical Fruits'],
    },
    {
      name: 'Papaya Platter',
      category: 'Quick Bites',
      description: 'Freshly carved sweet ripe papaya platter',
      ingredients: ['Ripe Papaya'],
    },

    // ── 3. Soups (Served with Bread and Butter) ─────────────────────────────
    {
      name: 'Cream of Chicken Soup',
      category: 'Soups',
      description: 'Rich creamy chicken soup served with bread and butter',
      ingredients: ['Chicken', 'Cream', 'Butter', 'Bread'],
    },
    {
      name: 'Chicken With Egg Drop Soup',
      category: 'Soups',
      description: 'Clear chicken broth with silky egg ribbons served with bread and butter',
      ingredients: ['Chicken', 'Egg', 'Chicken Broth', 'Butter', 'Bread'],
    },
    {
      name: 'Sweet Corn, Chicken With Egg Drop Soup',
      category: 'Soups',
      description: 'Sweet corn and shredded chicken soup with egg drop served with bread and butter',
      ingredients: ['Sweet Corn', 'Chicken', 'Egg', 'Butter', 'Bread'],
    },
    {
      name: 'Seafood and Mixed Vegetable With Egg Drop Soup',
      category: 'Soups',
      description: 'Hearty soup loaded with seafood, garden vegetables and egg ribbons',
      ingredients: ['Prawns', 'Calamari', 'Mixed Vegetables', 'Egg', 'Butter', 'Bread'],
    },
    {
      name: 'Seafood Tom Yum Soup',
      category: 'Soups',
      description: 'Authentic spicy and sour Thai seafood broth served with bread and butter',
      ingredients: ['Seafood', 'Lemongrass', 'Lime juice', 'Chili paste', 'Butter', 'Bread'],
    },
    {
      name: 'Mutton With Egg Drop Soup',
      category: 'Soups',
      description: 'Slow-simmered tender mutton soup with egg ribbons and warm spices',
      ingredients: ['Mutton', 'Egg', 'Aromatic Broth', 'Butter', 'Bread'],
    },
    {
      name: 'Vegetable Broth Soup',
      category: 'Soups',
      description: 'Light and nourishing clear seasonal vegetable broth served with bread and butter',
      ingredients: ['Seasonal Vegetables', 'Herbs', 'Butter', 'Bread'],
    },

    // ── 4. Fried Rice (Full & Half Portions) ─────────────────────────────────
    { name: 'Plain Rice (Full)', category: 'Fried Rice', description: 'Steamed basmati plain rice full portion', ingredients: ['Steamed Basmati Rice'], serves: '2 persons' },
    { name: 'Plain Rice (Half)', category: 'Fried Rice', description: 'Steamed basmati plain rice half portion', ingredients: ['Steamed Basmati Rice'], serves: '1 person' },

    { name: 'Vegetable Fried Rice [without Egg] (Full)', category: 'Fried Rice', description: 'Wok-tossed vegetable fried rice full portion without egg', ingredients: ['Basmati Rice', 'Carrots', 'Leeks', 'Cabbage', 'Soy sauce'], serves: '2 persons' },
    { name: 'Vegetable Fried Rice [without Egg] (Half)', category: 'Fried Rice', description: 'Wok-tossed vegetable fried rice half portion without egg', ingredients: ['Basmati Rice', 'Carrots', 'Leeks', 'Cabbage', 'Soy sauce'], serves: '1 person' },

    { name: 'Egg Fried Rice (Full)', category: 'Fried Rice', description: 'Classic wok-fried basmati rice with eggs and vegetables full portion', ingredients: ['Basmati Rice', 'Egg', 'Carrots', 'Leeks', 'Soy sauce'], serves: '2 persons' },
    { name: 'Egg Fried Rice (Half)', category: 'Fried Rice', description: 'Classic wok-fried basmati rice with eggs and vegetables half portion', ingredients: ['Basmati Rice', 'Egg', 'Carrots', 'Leeks', 'Soy sauce'], serves: '1 person' },

    { name: 'Chicken Fried Rice (Full)', category: 'Fried Rice', description: 'Fragrant fried rice tossed with tender seasoned chicken full portion', ingredients: ['Basmati Rice', 'Chicken', 'Egg', 'Vegetables', 'Soy sauce'], serves: '2 persons' },
    { name: 'Chicken Fried Rice (Half)', category: 'Fried Rice', description: 'Fragrant fried rice tossed with tender seasoned chicken half portion', ingredients: ['Basmati Rice', 'Chicken', 'Egg', 'Vegetables', 'Soy sauce'], serves: '1 person' },

    { name: 'Seafood Fried Rice (Full)', category: 'Fried Rice', description: 'Wok-fried rice with prawns, squid and fish full portion', ingredients: ['Basmati Rice', 'Prawns', 'Squid', 'Fish', 'Egg', 'Vegetables'], serves: '2 persons' },
    { name: 'Seafood Fried Rice (Half)', category: 'Fried Rice', description: 'Wok-fried rice with prawns, squid and fish half portion', ingredients: ['Basmati Rice', 'Prawns', 'Squid', 'Fish', 'Egg', 'Vegetables'], serves: '1 person' },

    { name: 'Mixed Fried Rice (Full)', category: 'Fried Rice', description: 'Wok-fried rice with chicken, seafood, egg and vegetables full portion', ingredients: ['Basmati Rice', 'Chicken', 'Seafood', 'Egg', 'Vegetables'], serves: '2 persons' },
    { name: 'Mixed Fried Rice (Half)', category: 'Fried Rice', description: 'Wok-fried rice with chicken, seafood, egg and vegetables half portion', ingredients: ['Basmati Rice', 'Chicken', 'Seafood', 'Egg', 'Vegetables'], serves: '1 person' },

    { name: 'Nasi Goreng (Full)', category: 'Fried Rice', description: 'Indonesian style spicy wok fried rice served with fried egg and crackers full portion', ingredients: ['Basmati Rice', 'Fried Egg', 'Chicken', 'Prawns', 'Chili paste'], serves: '2 persons' },
    { name: 'Nasi Goreng (Half)', category: 'Fried Rice', description: 'Indonesian style spicy wok fried rice half portion', ingredients: ['Basmati Rice', 'Fried Egg', 'Chicken', 'Prawns', 'Chili paste'], serves: '1 person' },

    { name: 'Mongolian Fried Rice (Full)', category: 'Fried Rice', description: 'Savory stir-fried Mongolian style rice with secret sauce full portion', ingredients: ['Basmati Rice', 'Chicken', 'Bell peppers', 'Mongolian sauce'], serves: '2 persons' },
    { name: 'Mongolian Fried Rice (Half)', category: 'Fried Rice', description: 'Savory stir-fried Mongolian style rice half portion', ingredients: ['Basmati Rice', 'Chicken', 'Bell peppers', 'Mongolian sauce'], serves: '1 person' },

    {
      name: 'Senari Special Fried Rice (Dining Only)',
      category: 'Fried Rice',
      description: 'Signature rice served with chicken leg, jumbo sausage, fried egg and chilli paste (Dining only)',
      ingredients: ['Basmati Rice', 'Chicken Leg', 'Jumbo Sausage', 'Fried Egg', 'Chilli Paste'],
      serves: '1-2 persons',
    },

    // ── 5. Noodles (Full & Half Portions) ───────────────────────────────────
    { name: 'Vegetable Noodles [without Egg] (Full)', category: 'Noodles', description: 'Wok-tossed noodles with fresh seasonal vegetables without egg full portion', ingredients: ['Noodles', 'Carrots', 'Cabbage', 'Leeks', 'Soy sauce'], serves: '2 persons' },
    { name: 'Vegetable Noodles [without Egg] (Half)', category: 'Noodles', description: 'Wok-tossed noodles with fresh seasonal vegetables without egg half portion', ingredients: ['Noodles', 'Carrots', 'Cabbage', 'Leeks', 'Soy sauce'], serves: '1 person' },

    { name: 'Egg Noodles (Full)', category: 'Noodles', description: 'Classic wok-fried egg noodles with scrambled egg and vegetables full portion', ingredients: ['Noodles', 'Egg', 'Carrots', 'Leeks', 'Spring Onion'], serves: '2 persons' },
    { name: 'Egg Noodles (Half)', category: 'Noodles', description: 'Classic wok-fried egg noodles with scrambled egg and vegetables half portion', ingredients: ['Noodles', 'Egg', 'Carrots', 'Leeks', 'Spring Onion'], serves: '1 person' },

    { name: 'Chicken Noodles (Full)', category: 'Noodles', description: 'Wok-fried egg noodles with seasoned chicken pieces full portion', ingredients: ['Noodles', 'Chicken', 'Egg', 'Vegetables', 'Soy sauce'], serves: '2 persons' },
    { name: 'Chicken Noodles (Half)', category: 'Noodles', description: 'Wok-fried egg noodles with seasoned chicken pieces half portion', ingredients: ['Noodles', 'Chicken', 'Egg', 'Vegetables', 'Soy sauce'], serves: '1 person' },

    { name: 'Seafood Noodles (Full)', category: 'Noodles', description: 'Wok-fried noodles with prawns, cuttlefish and fish full portion', ingredients: ['Noodles', 'Prawns', 'Cuttlefish', 'Fish', 'Egg', 'Vegetables'], serves: '2 persons' },
    { name: 'Seafood Noodles (Half)', category: 'Noodles', description: 'Wok-fried noodles with prawns, cuttlefish and fish half portion', ingredients: ['Noodles', 'Prawns', 'Cuttlefish', 'Fish', 'Egg', 'Vegetables'], serves: '1 person' },

    { name: 'Mixed Noodles (Full)', category: 'Noodles', description: 'Wok-fried noodles loaded with chicken, seafood and egg full portion', ingredients: ['Noodles', 'Chicken', 'Seafood', 'Egg', 'Vegetables'], serves: '2 persons' },
    { name: 'Mixed Noodles (Half)', category: 'Noodles', description: 'Wok-fried noodles loaded with chicken, seafood and egg half portion', ingredients: ['Noodles', 'Chicken', 'Seafood', 'Egg', 'Vegetables'], serves: '1 person' },

    {
      name: 'Chop-suey with Noodles or Rice (Half Portion)',
      category: 'Noodles',
      description: 'Crispy vegetable and chicken chop-suey served with noodles or rice half portion',
      ingredients: ['Noodles or Rice', 'Chicken', 'Baby Corn', 'Mushrooms', 'Chop-suey Gravy'],
      serves: '1 person',
    },

    // ── 6. Pasta & Macaroni ─────────────────────────────────────────────────
    { name: 'Penne Arrabbiata Chicken', category: 'Pasta & Macaroni', description: 'Penne pasta tossed in spicy garlic tomato sauce with chicken', ingredients: ['Penne Pasta', 'Chicken', 'Spicy Tomato Sauce', 'Garlic', 'Chili Flakes'] },
    { name: 'Spaghetti Carbonara', category: 'Pasta & Macaroni', description: 'Classic spaghetti in velvety cream, egg yolk, cheese and bacon/ham sauce', ingredients: ['Spaghetti', 'Cream', 'Egg Yolk', 'Cheese', 'Black Pepper'] },
    { name: 'Penne Alfredo with Prawns', category: 'Pasta & Macaroni', description: 'Creamy parmesan Alfredo sauce penne with succulent sautéed prawns', ingredients: ['Penne Pasta', 'Prawns', 'Alfredo Cream Sauce', 'Parmesan Cheese'] },

    { name: 'Cheese Macaroni (Sri Lankan Style)', category: 'Pasta & Macaroni', description: 'Sri Lankan style spiced macaroni loaded with melted cheese', ingredients: ['Macaroni', 'Cheese', 'Curry Spices', 'Onions', 'Chili'] },
    { name: 'Chicken Macaroni (Sri Lankan Style)', category: 'Pasta & Macaroni', description: 'Sri Lankan style spiced macaroni stir-fried with chicken', ingredients: ['Macaroni', 'Chicken', 'Curry Spices', 'Onions', 'Tomatoes'] },
    { name: 'Seafood Macaroni (Sri Lankan Style)', category: 'Pasta & Macaroni', description: 'Spicy macaroni stir-fried with prawns and cuttlefish', ingredients: ['Macaroni', 'Prawns', 'Cuttlefish', 'Curry Spices', 'Capsicum'] },
    { name: 'Mixed Macaroni (Sri Lankan Style)', category: 'Pasta & Macaroni', description: 'Spicy Sri Lankan macaroni stir-fried with chicken, seafood and egg', ingredients: ['Macaroni', 'Chicken', 'Seafood', 'Egg', 'Spices'] },

    // ── 7. Kottu (Full & Half Portions) ─────────────────────────────────────
    { name: 'Vegetable Kottu [without Egg] (Full)', category: 'Kottu', description: 'Shredded godamba roti stir-fried with vegetables without egg full portion', ingredients: ['Godamba Roti', 'Cabbage', 'Carrots', 'Leeks', 'Curry sauce'], serves: '2 persons' },
    { name: 'Vegetable Kottu [without Egg] (Half)', category: 'Kottu', description: 'Shredded godamba roti stir-fried with vegetables without egg half portion', ingredients: ['Godamba Roti', 'Cabbage', 'Carrots', 'Leeks', 'Curry sauce'], serves: '1 person' },

    { name: 'Egg Kottu (Full)', category: 'Kottu', description: 'Classic Sri Lankan street kottu with egg and vegetables full portion', ingredients: ['Godamba Roti', 'Egg', 'Vegetables', 'Curry sauce'], serves: '2 persons' },
    { name: 'Egg Kottu (Half)', category: 'Kottu', description: 'Classic Sri Lankan street kottu with egg and vegetables half portion', ingredients: ['Godamba Roti', 'Egg', 'Vegetables', 'Curry sauce'], serves: '1 person' },

    { name: 'Chicken Kottu (Full)', category: 'Kottu', description: 'Chopped flatbread tossed with tender chicken, egg, veg and rich curry full portion', ingredients: ['Godamba Roti', 'Chicken', 'Egg', 'Vegetables', 'Curry gravy'], serves: '2 persons' },
    { name: 'Chicken Kottu (Half)', category: 'Kottu', description: 'Chopped flatbread tossed with tender chicken, egg, veg and rich curry half portion', ingredients: ['Godamba Roti', 'Chicken', 'Egg', 'Vegetables', 'Curry gravy'], serves: '1 person' },

    { name: 'Cheese Kottu (Full)', category: 'Kottu', description: 'Creamy melted cheese mixed into chopped roti and vegetables full portion', ingredients: ['Godamba Roti', 'Cheese', 'Milk', 'Egg', 'Vegetables'], serves: '2 persons' },
    { name: 'Cheese Kottu (Half)', category: 'Kottu', description: 'Creamy melted cheese mixed into chopped roti and vegetables half portion', ingredients: ['Godamba Roti', 'Cheese', 'Milk', 'Egg', 'Vegetables'], serves: '1 person' },

    { name: 'Chicken & Cheese Kottu (Full)', category: 'Kottu', description: 'Indulgent kottu loaded with chicken, rich melted cheese and egg full portion', ingredients: ['Godamba Roti', 'Chicken', 'Cheese', 'Egg', 'Vegetables'], serves: '2 persons' },
    { name: 'Chicken & Cheese Kottu (Half)', category: 'Kottu', description: 'Indulgent kottu loaded with chicken, rich melted cheese and egg half portion', ingredients: ['Godamba Roti', 'Chicken', 'Cheese', 'Egg', 'Vegetables'], serves: '1 person' },

    { name: 'Seafood Kottu (Full)', category: 'Kottu', description: 'Street kottu tossed with prawns, squid, fish and spices full portion', ingredients: ['Godamba Roti', 'Prawns', 'Squid', 'Fish', 'Egg', 'Vegetables'], serves: '2 persons' },
    { name: 'Seafood Kottu (Half)', category: 'Kottu', description: 'Street kottu tossed with prawns, squid, fish and spices half portion', ingredients: ['Godamba Roti', 'Prawns', 'Squid', 'Fish', 'Egg', 'Vegetables'], serves: '1 person' },

    { name: 'Mixed Kottu (Full)', category: 'Kottu', description: 'Signature kottu with chicken, seafood, egg and vegetables full portion', ingredients: ['Godamba Roti', 'Chicken', 'Seafood', 'Egg', 'Vegetables'], serves: '2 persons' },
    { name: 'Mixed Kottu (Half)', category: 'Kottu', description: 'Signature kottu with chicken, seafood, egg and vegetables half portion', ingredients: ['Godamba Roti', 'Chicken', 'Seafood', 'Egg', 'Vegetables'], serves: '1 person' },

    { name: 'Senari Special Kottu (Full)', category: 'Kottu', description: 'Chef special premium kottu loaded with meats, egg, cheese and rich gravy full portion', ingredients: ['Godamba Roti', 'Chicken', 'Sausage', 'Egg', 'Cheese', 'Chef Special Sauce'], serves: '2 persons' },
    { name: 'Senari Special Kottu (Half)', category: 'Kottu', description: 'Chef special premium kottu loaded with meats, egg, cheese and rich gravy half portion', ingredients: ['Godamba Roti', 'Chicken', 'Sausage', 'Egg', 'Cheese', 'Chef Special Sauce'], serves: '1 person' },

    // ── 8. Mains & Portions: Chicken ────────────────────────────────────────
    { name: 'Devilled Chicken (or Chili Chicken)', category: 'Mains', description: 'Crispy fried chicken tossed in sweet, spicy and tangy devilled chili sauce', ingredients: ['Chicken', 'Capsicum', 'Onions', 'Devilled Chilli Sauce'] },
    { name: 'Stew or Curry Chicken', category: 'Mains', description: 'Tender chicken slow cooked in rich Sri Lankan aromatic curry or stew gravy', ingredients: ['Chicken', 'Coconut milk', 'Curry spices', 'Curry leaves'] },
    { name: 'Fried Chicken', category: 'Mains', description: 'Golden crispy deep-fried chicken portions seasoned with house spices', ingredients: ['Chicken', 'Spiced Flour Batter', 'Crispy Coating'] },
    { name: 'Hot Batter Chicken', category: 'Mains', description: 'Bite-sized chicken fried in crispy hot batter tossed in spicy chili butter', ingredients: ['Chicken', 'Crispy Batter', 'Chili Flakes', 'Garlic Butter'] },
    { name: 'Batter Garlic Chicken', category: 'Mains', description: 'Crispy batter-fried chicken infused with rich aromatic garlic sauce', ingredients: ['Chicken', 'Garlic', 'Batter', 'Spring Onions'] },
    { name: 'Chicken Curry', category: 'Mains', description: 'Traditional homestyle spicy chicken curry with thick gravy', ingredients: ['Chicken', 'Roasted Curry Powder', 'Garlic', 'Pandan Leaves'] },

    // ── 8. Mains & Portions: Pork ───────────────────────────────────────────
    { name: 'Devilled Pork', category: 'Mains', description: 'Tender pork cubes tossed with tomatoes, capsicum and spicy devilled sauce', ingredients: ['Pork', 'Capsicum', 'Onion', 'Spicy Devilled Sauce'] },
    { name: 'Stew or Curry or Chili Pork', category: 'Mains', description: 'Slow-cooked flavorful pork in rich curry spices or chili stew', ingredients: ['Pork', 'Chili', 'Curry Spices', 'Garlic', 'Ginger'] },
    { name: 'Fried Pork', category: 'Mains', description: 'Deep fried crispy seasoned pork pieces', ingredients: ['Pork', 'Black pepper', 'House seasoning'] },
    { name: 'Black Pepper Pork', category: 'Mains', description: 'Succulent pork pieces tossed in crushed black pepper and caramelized onions', ingredients: ['Pork', 'Crushed Black Pepper', 'Caramelized Onions', 'Soy sauce'] },

    // ── 8. Mains & Portions: Fish ───────────────────────────────────────────
    { name: 'Devilled or Chili Fish', category: 'Mains', description: 'Fried fish cubes stir-fried with capsicum, onions and fiery chili sauce', ingredients: ['Fish Fillets', 'Capsicum', 'Onions', 'Devilled Sauce'] },
    { name: 'Stew or Curry Fish', category: 'Mains', description: 'Fresh fish fillets simmered in coconut milk curry or delicate stew', ingredients: ['Fish', 'Coconut Milk', 'Turmeric', 'Fenugreek', 'Curry leaves'] },
    { name: 'Fried Fish', category: 'Mains', description: 'Crispy seasoned whole fried fish fillets', ingredients: ['Fish Fillets', 'Turmeric', 'Chili powder', 'Salt'] },
    { name: 'Boiled Fish', category: 'Mains', description: 'Healthy fresh fish fillets boiled with herbs and pepper', ingredients: ['Fish', 'Pepper', 'Salt', 'Herb broth'] },
    { name: 'Fish Fingers', category: 'Mains', description: 'Golden crumbed fish fillets served with dipping sauce', ingredients: ['Fish Fillets', 'Breadcrumbs', 'Egg wash', 'Tartar sauce'] },

    // ── 8. Mains & Portions: Octopus (Sri Lankan Style) ─────────────────────
    { name: 'Octopus Stew (Sri Lankan Style)', category: 'Mains', description: 'Tender octopus braised in mild aromatic Sri Lankan style stew with vegetables', ingredients: ['Octopus', 'Potatoes', 'Carrots', 'Black Pepper', 'Onions'] },
    { name: 'Octopus Curry (Sri Lankan Style)', category: 'Mains', description: 'Slow cooked spicy octopus curry in roasted spices and coconut gravy', ingredients: ['Octopus', 'Roasted Curry Powder', 'Coconut Milk', 'Garlic', 'Goraka'] },
    { name: 'Boiled Octopus with Salad', category: 'Mains', description: 'Tender boiled octopus seasoned and served alongside fresh garden salad', ingredients: ['Boiled Octopus', 'Lettuce', 'Cucumber', 'Tomato Salad', 'Lemon Vinaigrette'] },
  ];

  // ── Seed Food Items with safe Json array defaults for images & ingredients ──
  const foodItems = await Promise.all(
    foodItemsData.map((item, index) =>
      prisma.foodItem.create({
        data: {
          name: item.name,
          price: 1000.0, // 🌟 Default price as requested
          description: item.description,
          categoryId: foodCatMap[item.category] || foodCategories[0].id,
          image: null,
          // Explicit empty JSON array for the catalog column
          images: [],
          prepTimeMinutes: 15, // 🌟 Default prep time: 15 min
          calories: 10,        // 🌟 Default calories: 10
          serves: item.serves || '1 person', // 🌟 Default serves: 1 person
          ingredients: item.ingredients || [], // 🌟 Ingredients array for Key Ingredients section
          isHealthy: item.name.toLowerCase().includes('vegetable') || item.name.toLowerCase().includes('boiled'),
          isNew: false,
          isFeatured: false,
          isAvailable: true,
          sortOrder: index + 1,
        },
      })
    )
  );
  console.log(`   ✅ Created ${foodItems.length} food items from PDF Menu (Price: 1000, Prep: 15m, Cal: 10, Serves: 1 person)`);
  

 // ── Restaurant Tables (Required for Dine-in POS Orders) ───────────────────
  const tableData: { tableNumber: string; capacity: number; status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'; notes: string | null }[] = [
    { tableNumber: 'T1', capacity: 2, status: 'AVAILABLE', notes: 'Window side' },
    { tableNumber: 'T2', capacity: 4, status: 'AVAILABLE', notes: 'Near entrance' },
    { tableNumber: 'T3', capacity: 4, status: 'AVAILABLE', notes: null },
    { tableNumber: 'T4', capacity: 6, status: 'AVAILABLE', notes: 'Family table' },
    { tableNumber: 'T5', capacity: 2, status: 'AVAILABLE', notes: null },
    { tableNumber: 'T6', capacity: 4, status: 'AVAILABLE', notes: null },
    { tableNumber: 'T7', capacity: 8, status: 'AVAILABLE', notes: 'Large group table' },
    { tableNumber: 'VIP1', capacity: 4, status: 'AVAILABLE', notes: 'VIP section' },
    { tableNumber: 'VIP2', capacity: 6, status: 'AVAILABLE', notes: null },
    { tableNumber: 'B1', capacity: 4, status: 'AVAILABLE', notes: 'Balcony area' },
  ];
  const tables = await Promise.all(tableData.map((t) => prisma.restaurantTable.create({ data: t })));
  console.log(`   ✅ Created ${tables.length} restaurant tables`);

  // ── Default System Settings (Required singleton row for POS) ──────────────
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      hotelName: 'Senari Chinese Restaurant',
      reportTagline: 'Business Intelligence & Performance Report',
      confidentialityNotice: 'SENARI CHINESE RESTAURANT — Confidential',
      currencySymbol: 'Rs.',
      compactTableView: false,
      darkMode: true,
      playOrderSound: true,
      autoAcceptOrders: false,
      lowStockThreshold: 10,
      pdfOrientation: 'portrait',
    },
  });
  console.log('   ✅ Initialized system settings');

  console.log('🎉 Clean production seed complete! Ready for client handover.');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });