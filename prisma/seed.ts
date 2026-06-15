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
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
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

  // ── Admin User ───────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@senari.com',
      password: hashedPassword,
      role: 'ADMIN',
      active: true,
    },
  });
  console.log(`   ✅ Created admin user: ${admin.email}`);

  // ── Food Categories ──────────────────────────────────────────────────────
  const foodCategoryNames = [
    'Street Food',
    'Rice Dishes',
    'Noodles',
    'Mains',
    'Desserts',
    'Beverages',
  ];

  const foodCategories = await Promise.all(
    foodCategoryNames.map((name) =>
      prisma.category.create({
        data: { name, type: 'FOOD' },
      })
    )
  );
  console.log(`   ✅ Created ${foodCategories.length} food categories`);

  // ── Inventory Categories ─────────────────────────────────────────────────
  const inventoryCategoryNames = [
    'Meat',
    'Seafood',
    'Vegetables',
    'Groceries',
    'Dairy',
    'Spices',
    'Oils',
    'Packaging',
  ];

  const inventoryCategories = await Promise.all(
    inventoryCategoryNames.map((name) =>
      prisma.category.create({
        data: { name, type: 'INVENTORY' },
      })
    )
  );
  console.log(`   ✅ Created ${inventoryCategories.length} inventory categories`);

  // ── Units ────────────────────────────────────────────────────────────────
  const unitData = [
    { name: 'Kilogram', abbreviation: 'kg' },
    { name: 'Gram', abbreviation: 'g' },
    { name: 'Liter', abbreviation: 'L' },
    { name: 'Milliliter', abbreviation: 'ml' },
    { name: 'Packet', abbreviation: 'packets' },
    { name: 'Tray', abbreviation: 'trays' },
    { name: 'Bottle', abbreviation: 'bottles' },
    { name: 'Bunch', abbreviation: 'bunches' },
    { name: 'Can', abbreviation: 'cans' },
    { name: 'Block', abbreviation: 'blocks' },
    { name: 'Portion', abbreviation: 'portions' },
    { name: 'Piece', abbreviation: 'pcs' },
  ];

  const units = await Promise.all(
    unitData.map((u) =>
      prisma.unit.create({
        data: u,
      })
    )
  );
  // ── Food Items ────────────────────────────────────────────────────────────
  const foodItemsData = [
    {
      name: 'Chicken Kottu',
      price: 890,
      description: 'Stir-fried flatbread with chicken, vegetables, and aromatic spices',
      categoryId: foodCategories[0].id, // Street Food
      isAvailable: true,
      isNew: true,
      sortOrder: 1,
    },
    {
      name: 'Egg Kottu',
      price: 690,
      description: 'Classic kottu roti with egg and vegetables',
      categoryId: foodCategories[0].id,
      isAvailable: true,
      isNew: false,
      sortOrder: 2,
    },
    {
      name: 'Chicken Fried Rice',
      price: 850,
      description: 'Wok-fried rice with tender chicken pieces, egg, and vegetables',
      categoryId: foodCategories[1].id, // Rice Dishes
      isAvailable: true,
      isNew: false,
      sortOrder: 3,
    },
    {
      name: 'Nasi Goreng',
      price: 950,
      description: 'Indonesian-style fried rice with fried egg, crackers, and sambal',
      categoryId: foodCategories[1].id,
      isAvailable: true,
      isNew: true,
      sortOrder: 4,
    },
    {
      name: 'Chicken Noodles',
      price: 820,
      description: 'Egg noodles wok-tossed with chicken and seasonal vegetables',
      categoryId: foodCategories[2].id, // Noodles
      isAvailable: true,
      isNew: false,
      sortOrder: 5,
    },
    {
      name: 'Devilled Chicken',
      price: 1200,
      description: 'Crispy fried chicken tossed in spicy devilled sauce with onions and peppers',
      categoryId: foodCategories[3].id, // Mains
      isAvailable: true,
      isNew: false,
      sortOrder: 6,
    },
    {
      name: 'Sweet & Sour Fish',
      price: 1350,
      description: 'Deep-fried fish fillets in tangy sweet and sour sauce',
      categoryId: foodCategories[3].id,
      isAvailable: true,
      isNew: true,
      sortOrder: 7,
    },
    {
      name: 'Watalappan',
      price: 350,
      description: 'Traditional Sri Lankan steamed coconut custard with jaggery',
      categoryId: foodCategories[4].id, // Desserts
      isAvailable: true,
      isNew: false,
      sortOrder: 8,
    },
    {
      name: 'Ice Cream Trio',
      price: 450,
      description: 'Three scoops of vanilla, chocolate, and strawberry ice cream',
      categoryId: foodCategories[4].id,
      isAvailable: true,
      isNew: false,
      sortOrder: 9,
    },
    {
      name: 'Fresh Lime Juice',
      price: 250,
      description: 'Freshly squeezed lime juice with a hint of salt and sugar',
      categoryId: foodCategories[5].id, // Beverages
      isAvailable: true,
      isNew: false,
      sortOrder: 10,
    },
    {
      name: 'Mango Lassi',
      price: 350,
      description: 'Creamy yoghurt drink blended with ripe Alphonso mangoes',
      categoryId: foodCategories[5].id,
      isAvailable: true,
      isNew: true,
      sortOrder: 11,
    },
    {
      name: 'Chicken Curry & Rice',
      price: 1100,
      description: 'Fragrant Sri Lankan chicken curry served with steamed rice and sambols',
      categoryId: foodCategories[1].id,
      isAvailable: true,
      isNew: false,
      sortOrder: 12,
    },
  ];

  const foodItems = await Promise.all(
    foodItemsData.map((item) =>
      prisma.foodItem.create({
        data: item,
      })
    )
  );
  console.log(`   ✅ Created ${foodItems.length} food items`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });