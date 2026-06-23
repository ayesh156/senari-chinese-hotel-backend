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

  // ── Admin User ───────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.create({
    data: { name: 'Admin', email: 'admin@senari.com', password: hashedPassword, role: 'ADMIN', active: true },
  });
  console.log(`   ✅ Created admin user: ${admin.email}`);

  // ── Food Categories ──────────────────────────────────────────────────────
  const foodCategoryNames = ['Street Food', 'Rice Dishes', 'Noodles', 'Mains', 'Desserts', 'Beverages'];
  const foodCategories = await Promise.all(foodCategoryNames.map((name) => prisma.category.create({ data: { name, type: 'FOOD' } })));
  console.log(`   ✅ Created ${foodCategories.length} food categories`);

  const inventoryCategoryNames = ['Meat', 'Seafood', 'Vegetables', 'Groceries', 'Dairy', 'Spices', 'Oils', 'Packaging'];
  const inventoryCategories = await Promise.all(inventoryCategoryNames.map((name) => prisma.category.create({ data: { name, type: 'INVENTORY' } })));
  console.log(`   ✅ Created ${inventoryCategories.length} inventory categories`);

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
  const foodItemsData = [
    { name: 'Chicken Kottu', price: 890, description: 'Stir-fried flatbread with chicken, vegetables, and aromatic spices', categoryId: foodCategories[0].id, isNew: true, sortOrder: 1 },
    { name: 'Egg Kottu', price: 690, description: 'Classic kottu roti with egg and vegetables', categoryId: foodCategories[0].id, sortOrder: 2 },
    { name: 'Chicken Fried Rice', price: 850, description: 'Wok-fried rice with tender chicken pieces, egg, and vegetables', categoryId: foodCategories[1].id, sortOrder: 3 },
    { name: 'Nasi Goreng', price: 950, description: 'Indonesian-style fried rice with fried egg, crackers, and sambal', categoryId: foodCategories[1].id, isNew: true, sortOrder: 4 },
    { name: 'Chicken Noodles', price: 820, description: 'Egg noodles wok-tossed with chicken and seasonal vegetables', categoryId: foodCategories[2].id, sortOrder: 5 },
    { name: 'Devilled Chicken', price: 1200, description: 'Crispy fried chicken tossed in spicy devilled sauce', categoryId: foodCategories[3].id, sortOrder: 6 },
    { name: 'Sweet & Sour Fish', price: 1350, description: 'Deep-fried fish fillets in tangy sweet and sour sauce', categoryId: foodCategories[3].id, isNew: true, sortOrder: 7 },
    { name: 'Watalappan', price: 350, description: 'Traditional Sri Lankan steamed coconut custard with jaggery', categoryId: foodCategories[4].id, sortOrder: 8 },
    { name: 'Ice Cream Trio', price: 450, description: 'Three scoops of vanilla, chocolate, and strawberry ice cream', categoryId: foodCategories[4].id, sortOrder: 9 },
    { name: 'Fresh Lime Juice', price: 250, description: 'Freshly squeezed lime juice with a hint of salt and sugar', categoryId: foodCategories[5].id, sortOrder: 10 },
    { name: 'Mango Lassi', price: 350, description: 'Creamy yoghurt drink blended with ripe Alphonso mangoes', categoryId: foodCategories[5].id, isNew: true, sortOrder: 11 },
    { name: 'Chicken Curry & Rice', price: 1100, description: 'Fragrant Sri Lankan chicken curry served with steamed rice', categoryId: foodCategories[1].id, sortOrder: 12 },
  ];
  const foodItems = await Promise.all(foodItemsData.map((item) => prisma.foodItem.create({ data: { ...item, isAvailable: true, isNew: item.isNew ?? false } })));
  console.log(`   ✅ Created ${foodItems.length} food items`);

  // ── Inventory Items ──────────────────────────────────────────────────────
  const catMap = Object.fromEntries(inventoryCategories.map(c => [c.name, c.id]));
  const unitMap = Object.fromEntries(units.map(u => [u.name, u.id]));
  const inventoryItemsData = [
    { name: 'Basmati Rice', sku: 'ITM00001', categoryName: 'Groceries', quantity: 45, unitName: 'Kilogram', minAlertLevel: 20, unitPrice: 350 },
    { name: 'Chicken Breast', sku: 'ITM00002', categoryName: 'Meat', quantity: 8, unitName: 'Kilogram', minAlertLevel: 15, unitPrice: 1200 },
    { name: 'Yellow Onions', sku: 'ITM00003', categoryName: 'Vegetables', quantity: 0, unitName: 'Kilogram', minAlertLevel: 10, unitPrice: 180 },
    { name: 'Cooking Oil', sku: 'ITM00004', categoryName: 'Oils', quantity: 12, unitName: 'Liter', minAlertLevel: 5, unitPrice: 650 },
    { name: 'Mixed Spice Blend', sku: 'ITM00005', categoryName: 'Spices', quantity: 3, unitName: 'Packet', minAlertLevel: 10, unitPrice: 450 },
    { name: 'Fresh Ginger', sku: 'ITM00006', categoryName: 'Vegetables', quantity: 5, unitName: 'Kilogram', minAlertLevel: 8, unitPrice: 400 },
    { name: 'Eggs', sku: 'ITM00007', categoryName: 'Dairy', quantity: 0, unitName: 'Tray', minAlertLevel: 20, unitPrice: 850 },
    { name: 'Soy Sauce', sku: 'ITM00008', categoryName: 'Groceries', quantity: 24, unitName: 'Bottle', minAlertLevel: 10, unitPrice: 320 },
    { name: 'Prawns', sku: 'ITM00009', categoryName: 'Seafood', quantity: 6, unitName: 'Kilogram', minAlertLevel: 10, unitPrice: 2800 },
    { name: 'Spring Onions', sku: 'ITM00010', categoryName: 'Vegetables', quantity: 15, unitName: 'Bunch', minAlertLevel: 5, unitPrice: 120 },
    { name: 'Garlic', sku: 'ITM00011', categoryName: 'Vegetables', quantity: 4, unitName: 'Kilogram', minAlertLevel: 8, unitPrice: 500 },
    { name: 'Coconut Milk', sku: 'ITM00012', categoryName: 'Groceries', quantity: 0, unitName: 'Can', minAlertLevel: 12, unitPrice: 280 },
    { name: 'Red Chili Powder', sku: 'ITM00013', categoryName: 'Spices', quantity: 18, unitName: 'Kilogram', minAlertLevel: 5, unitPrice: 900 },
    { name: 'Beef Mince', sku: 'ITM00014', categoryName: 'Meat', quantity: 2, unitName: 'Kilogram', minAlertLevel: 8, unitPrice: 1500 },
    { name: 'Carrots', sku: 'ITM00015', categoryName: 'Vegetables', quantity: 22, unitName: 'Kilogram', minAlertLevel: 10, unitPrice: 220 },
    { name: 'Firm Tofu', sku: 'ITM00016', categoryName: 'Groceries', quantity: 0, unitName: 'Block', minAlertLevel: 6, unitPrice: 350 },
    { name: 'Fish Sauce', sku: 'ITM00017', categoryName: 'Groceries', quantity: 9, unitName: 'Liter', minAlertLevel: 4, unitPrice: 480 },
    { name: 'Bell Peppers', sku: 'ITM00018', categoryName: 'Vegetables', quantity: 7, unitName: 'Kilogram', minAlertLevel: 10, unitPrice: 650 },
    { name: 'Chicken Thighs', sku: 'ITM00019', categoryName: 'Meat', quantity: 0, unitName: 'Kilogram', minAlertLevel: 12, unitPrice: 1100 },
    { name: 'Pork Belly', sku: 'ITM00020', categoryName: 'Meat', quantity: 5, unitName: 'Kilogram', minAlertLevel: 6, unitPrice: 1800 },
    { name: 'Turmeric Powder', sku: 'ITM00021', categoryName: 'Spices', quantity: 14, unitName: 'Gram', minAlertLevel: 5, unitPrice: 150 },
    { name: 'Cinnamon Sticks', sku: 'ITM00022', categoryName: 'Spices', quantity: 6, unitName: 'Packet', minAlertLevel: 4, unitPrice: 280 },
    { name: 'Green Chilies', sku: 'ITM00023', categoryName: 'Vegetables', quantity: 12, unitName: 'Piece', minAlertLevel: 8, unitPrice: 50 },
    { name: 'Cardamom Pods', sku: 'ITM00024', categoryName: 'Spices', quantity: 4, unitName: 'Gram', minAlertLevel: 3, unitPrice: 3500 },
  ];
  const inventoryItems = await Promise.all(inventoryItemsData.map((item) => prisma.inventoryItem.create({ data: { sku: item.sku, name: item.name, categoryId: catMap[item.categoryName], unitId: unitMap[item.unitName], quantity: item.quantity, minAlertLevel: item.minAlertLevel, unitPrice: item.unitPrice } })));
  console.log(`   ✅ Created ${inventoryItems.length} inventory items`);

  // ── Inventory Adjustments ──────────────────────────────────────────────
  const adjItemMap = Object.fromEntries(inventoryItems.map(i => [i.name, i.id]));
  const adjustmentsData = [
    { itemName: 'Chicken Breast', type: 'New Delivery', qty: 15, prevQty: 0, notes: 'Weekly poultry order' },
    { itemName: 'Chicken Breast', type: 'Daily Usage', qty: -7, prevQty: 15, notes: 'Used for lunch service' },
    { itemName: 'Chicken Breast', type: 'New Delivery', qty: 15, prevQty: 8, notes: 'Top-up order' },
    { itemName: 'Basmati Rice', type: 'New Delivery', qty: 50, prevQty: 0, notes: 'Bulk rice order' },
    { itemName: 'Basmati Rice', type: 'Daily Usage', qty: -5, prevQty: 50, notes: 'Requisition' },
    { itemName: 'Yellow Onions', type: 'New Delivery', qty: 20, prevQty: 0, notes: 'Initial stock' },
    { itemName: 'Yellow Onions', type: 'Daily Usage', qty: -20, prevQty: 20, notes: 'Consumed' },
    { itemName: 'Cooking Oil', type: 'New Delivery', qty: 20, prevQty: 0, notes: 'Bulk purchase' },
    { itemName: 'Cooking Oil', type: 'Daily Usage', qty: -8, prevQty: 20, notes: 'Deep frying' },
    { itemName: 'Prawns', type: 'New Delivery', qty: 10, prevQty: 0, notes: 'Seafood delivery' },
    { itemName: 'Prawns', type: 'Daily Usage', qty: -4, prevQty: 10, notes: 'Used' },
    { itemName: 'Eggs', type: 'New Delivery', qty: 30, prevQty: 0, notes: 'Dairy delivery' },
    { itemName: 'Eggs', type: 'Daily Usage', qty: -30, prevQty: 30, notes: 'Morning prep' },
    { itemName: 'Green Chilies', type: 'New Delivery', qty: 8, prevQty: 0, notes: 'Weekly vegetable order' },
  ];
  for (const adj of adjustmentsData) { await prisma.inventoryAdjustment.create({ data: { inventoryItemId: adjItemMap[adj.itemName], adjustmentType: adj.type, quantity: adj.qty, previousStock: adj.prevQty, newStock: adj.prevQty + adj.qty, notes: adj.notes } }); }
  console.log(`   ✅ Created ${adjustmentsData.length} inventory adjustments`);

  // ── Customers ──────────────────────────────────────────────────────────
  const customerData = [
    { name: 'Kamal Perera', phone: '0771234567', email: 'kamal@example.com', address: '12 Galle Rd, Matara' },
    { name: 'Nimal Silva', phone: '0719876543', email: 'nimal@example.com', address: '45 Main St, Colombo 03' },
    { name: 'Sanduni Fernando', phone: '0765551234', email: 'sanduni@example.com', address: '8 Temple Rd, Kandy' },
    { name: 'Ruwan Jayawardena', phone: '0704449876', email: '', address: '22 Lake View, Kurunegala' },
    { name: 'Priya Wickramasinghe', phone: '0782223344', email: 'priya@example.com', address: '5 Beach Rd, Galle' },
    { name: 'Chamara Bandara', phone: '0756667788', email: 'chamara@example.com', address: '33 Hill St, Nuwara Eliya' },
    { name: 'Dilani Rathnayake', phone: '0778882211', email: '', address: '17 Park Ave, Negombo' },
    { name: 'Asanka Gunawardena', phone: '0713335566', email: 'asanka@example.com', address: '9 Fort Rd, Trincomalee' },
    { name: 'Tharushi Perera', phone: '0761112233', email: 'tharushi@example.com', address: '3 Lotus Rd, Batticaloa' },
    { name: 'Malith Bandara', phone: '0773345566', email: '', address: '28 River Rd, Ratnapura' },
    { name: 'Sachini Rajapaksa', phone: '0715567788', email: 'sachini@example.com', address: '14 Garden Rd, Anuradhapura' },
    { name: 'Dinesh Kumara', phone: '0787789900', email: 'dinesh@example.com', address: '6 Station Rd, Badulla' },
    { name: 'Amali Senanayake', phone: '0759901122', email: '', address: '19 Sea View, Hambantota' },
    { name: 'Roshan Wijesinghe', phone: '0701123344', email: 'roshan@example.com', address: '41 Central Rd, Polonnaruwa' },
    { name: 'Kavinda Dissanayake', phone: '0772234455', email: 'kavinda@example.com', address: '7 Lotus Lane, Ampara' },
    { name: 'Ishara Madushani', phone: '0714456677', email: 'ishara@example.com', address: '55 Hill Top, Kegalle' },
    { name: 'Nuwan Priyantha', phone: '0766678899', email: '', address: '11 Canal Rd, Kalutara' },
    { name: 'Chamodi Rathnayake', phone: '0788890011', email: 'chamodi@example.com', address: '23 Flower Rd, Matale' },
    { name: 'Lasith Malinga', phone: '0700012233', email: '', address: '2 Coconut Grove, Puttalam' },
    { name: 'Hiruni Jayasekara', phone: '0752234455', email: 'hiruni@example.com', address: '36 Sunset Blvd, Chilaw' },
  ];
  const customers = await Promise.all(customerData.map((c) => prisma.customer.create({ data: c })));
  console.log(`   ✅ Created ${customers.length} customers`);

  // ── Orders ──────────────────────────────────────────────────────────
  const orderStatuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED'] as const;
  const paymentStatuses = ['UNPAID', 'PAID', 'PARTIAL'] as const;
  const orderTypes = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const;
  const customerNameCycle = ['Walk-in Customer', 'Kamal Perera', 'Nimal Silva', 'Sanduni Fernando', 'Ruwan Jayawardena', 'Priya Wickramasinghe'];
  let invoiceSeq = 582910;
  for (let i = 0; i < 15; i++) {
    const status = orderStatuses[i % orderStatuses.length];
    const payStatus = paymentStatuses[i % paymentStatuses.length];
    const type = orderTypes[i % orderTypes.length];
    const customerName = customerNameCycle[i % customerNameCycle.length];
    const customerMatch = customers.find(c => c.name === customerName);
    const customerId = customerMatch ? customerMatch.id : null;
    const itemCount = 1 + (i % 3);
    const foodItemsForOrder = foodItems.slice(0, itemCount);
    const subtotal = foodItemsForOrder.reduce((s, f) => s + Number(f.price), 0);
    const discount = Math.round(subtotal * 0.05);
    const total = subtotal - discount;
    const amountPaid = payStatus === 'PAID' ? total : payStatus === 'PARTIAL' ? Math.round(total * 0.5) : 0;
    await prisma.order.create({ data: { invoiceNumber: `INV${++invoiceSeq}`, type, status, paymentStatus: payStatus, subtotal, discount, total, amountPaid, customerId, notes: JSON.stringify({ customerName }), items: { create: foodItemsForOrder.map((f) => ({ foodId: f.id, quantity: 1 + (i % 2), unitPrice: Number(f.price), subtotal: Number(f.price) * (1 + (i % 2)) })) } } });
  }
  console.log(`   ✅ Created 15 orders with items`);

  // ── Suppliers ──────────────────────────────────────────────────────────
  const supplierData = [
    { name: 'Perera Groceries', phone: '0771112233', category: 'Groceries', email: 'info@pereragroceries.lk', address: '15 Main St, Colombo 11' },
    { name: 'Sena Poultry', phone: '0712223344', category: 'Meat', email: 'orders@senapoultry.lk', address: '88 Industrial Zone, Seeduwa' },
    { name: 'Green Valley Farms', phone: '0763334455', category: 'Vegetables', email: 'farm@greenvalley.lk', address: '42 Kandy Rd, Peradeniya' },
    { name: 'Ceylon Spice Traders', phone: '0774445566', category: 'Spices', email: 'sales@ceylonspice.lk', address: '7 Spice Market, Matale' },
    { name: 'Ocean Fresh Seafood', phone: '0705556677', category: 'Seafood', email: 'catch@oceanfresh.lk', address: '32 Harbour Rd, Negombo' },
    { name: 'Lanka Dairy Co-op', phone: '0786667788', category: 'Dairy', email: 'info@lankadairy.lk', address: '21 Lake Rd, Kurunegala' },
  ];
  const suppliers = await Promise.all(supplierData.map((s) => prisma.supplier.create({ data: s })));
  console.log(`   ✅ Created ${suppliers.length} suppliers`);

  // ── Purchase Orders (for Payables) ────────────────────────────────────
  let poSeq = 100;
  const purchaseOrderData = [
    { si: 0, total: 45000, paid: 0, status: 'UNPAID', notes: 'Monthly grocery supply' },
    { si: 0, total: 28000, paid: 0, status: 'UNPAID', notes: 'Oil, sugar, canned goods' },
    { si: 1, total: 32000, paid: 32000, status: 'PAID', notes: 'Chicken breast bulk order' },
    { si: 1, total: 18500, paid: 0, status: 'UNPAID', notes: 'Chicken thighs + eggs' },
    { si: 2, total: 12000, paid: 6000, status: 'PARTIAL', notes: 'Fresh vegetables' },
    { si: 2, total: 8500, paid: 0, status: 'UNPAID', notes: 'Herbs & exotic greens' },
    { si: 3, total: 9600, paid: 0, status: 'UNPAID', notes: 'Spice blend assortment' },
    { si: 3, total: 14000, paid: 14000, status: 'PAID', notes: 'Turmeric, cinnamon bulk' },
    { si: 4, total: 22000, paid: 0, status: 'UNPAID', notes: 'Prawns, fish fillets, squid' },
    { si: 5, total: 16000, paid: 8000, status: 'PARTIAL', notes: 'Milk, yoghurt, cheese' },
  ];
  for (const po of purchaseOrderData) {
    const supplierId = suppliers[po.si].id;
    await prisma.purchaseOrder.create({
      data: { poNumber: `PO-${++poSeq}`, supplierId, subtotal: po.total, paidAmount: po.paid, paymentStatus: po.status as any, notes: po.notes, receivedAt: new Date() },
    });
    const agg = await prisma.purchaseOrder.aggregate({ where: { supplierId }, _sum: { subtotal: true, paidAmount: true } });
    const tp = Number(agg._sum.subtotal || 0);
    const tpd = Number(agg._sum.paidAmount || 0);
    await prisma.supplier.update({ where: { id: supplierId }, data: { totalPurchases: tp, payableAmount: Math.max(0, tp - tpd) } });
  }
  console.log(`   ✅ Created ${purchaseOrderData.length} purchase orders`);

  // ── Supplier Ledger History ─────────────────────────────────────────────
  await prisma.supplierPayment.create({ data: { supplierId: suppliers[0].id, amountPaid: 15000, notes: 'Partial payment for monthly grocery supply' } });
  await prisma.supplierPayment.create({ data: { supplierId: suppliers[2].id, amountPaid: 6000, notes: 'Payment for vegetables delivery' } });
  await prisma.supplierReminder.create({ data: { supplierId: suppliers[0].id, message: 'Dear Perera Groceries, please process your outstanding invoices with Senari Chinese Hotel.', status: 'sent' } });
  await prisma.supplierReminder.create({ data: { supplierId: suppliers[4].id, message: 'Dear Ocean Fresh Seafood, kindly review your pending payments. Thank you!', status: 'sent' } });
  console.log('   ✅ Created supplier payments & reminders (ledger history)');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });