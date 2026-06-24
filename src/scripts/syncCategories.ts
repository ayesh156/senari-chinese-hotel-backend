/**
 * One-Time Migration Script: Sync legacy categories to Master Data.
 *
 * Reads existing string categories from Supplier table
 * and creates them in the Category master data table with the correct type.
 *
 * Usage: npx ts-node src/scripts/syncCategories.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function syncCategories() {
  console.log('🔄 Starting category sync...\n');

  // ── 1. Sync Inventory Categories (already use FK — no action needed) ──
  const inventoryItems = await prisma.inventoryItem.findMany({
    select: { name: true, categoryId: true },
  });
  console.log(
    `Found ${inventoryItems.length} inventory items (already linked via categoryId — no sync needed)`
  );

  // ── 2. Sync Supplier Categories (legacy string `category` field) ──
  const suppliers = await prisma.supplier.findMany({
    select: { category: true },
  });
  const uniqueSupCategories = [
    ...new Set(suppliers.map((s) => s.category).filter(Boolean)),
  ] as string[];

  if (uniqueSupCategories.length === 0) {
    console.log('No supplier categories to sync.');
  } else {
    console.log(
      `Found ${uniqueSupCategories.length} unique supplier categories: [${uniqueSupCategories.join(', ')}]`
    );

    for (const catName of uniqueSupCategories) {
      await prisma.category.upsert({
        where: { name_type: { name: catName, type: 'SUPPLIER' } },
        update: {},
        create: {
          name: catName,
          type: 'SUPPLIER',
        },
      });
      console.log(`  ✅ Synced supplier category: "${catName}"`);
    }
  }

  console.log('\n✅ Category sync completed successfully!');
}

syncCategories()
  .catch((e) => {
    console.error('❌ Sync failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());