/**
 * One-off migration script to update existing inventory SKUs to the new ITMXXXXX format.
 * 
 * Old format examples: GRN-001, MT-002, VEG-003, etc.
 * New format: ITM00001, ITM00002, ITM00003, etc.
 * 
 * Run: npx tsx prisma/update-skus.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔄 Updating inventory SKUs to ITMXXXXX format...\n');

  // Fetch all inventory items, ordered by id ascending
  const items = await prisma.inventoryItem.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, name: true, sku: true },
  });

  console.log(`   Found ${items.length} inventory items to update\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const newSku = `ITM${String(i + 1).padStart(5, '0')}`;

    // Skip if already in the correct format
    if (item.sku === newSku) {
      console.log(`   ⏭️  Skipped "${item.name}": already ${item.sku}`);
      skippedCount++;
      continue;
    }

    console.log(`   🔄 Updated "${item.name}": ${item.sku} → ${newSku}`);

    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { sku: newSku },
    });

    updatedCount++;
  }

  console.log(`\n✅ Complete! ${updatedCount} updated, ${skippedCount} already correct`);
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });