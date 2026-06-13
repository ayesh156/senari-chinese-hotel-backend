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
  console.log(`   ✅ Created ${units.length} units`);

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