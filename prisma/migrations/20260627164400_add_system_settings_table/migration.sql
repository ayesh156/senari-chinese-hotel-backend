/*
  Warnings:

  - You are about to drop the column `calories` on the `food_items` table. All the data in the column will be lost.
  - You are about to drop the column `ingredients` on the `food_items` table. All the data in the column will be lost.
  - You are about to drop the column `prepTime` on the `food_items` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `purchase_order_items` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `restaurant_tables` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,type]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subTotal` to the `purchase_order_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `purchase_orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `categories_name_key` ON `categories`;

-- AlterTable
ALTER TABLE `categories` MODIFY `type` ENUM('FOOD', 'INVENTORY', 'SUPPLIER') NOT NULL;

-- AlterTable
ALTER TABLE `food_items` DROP COLUMN `calories`,
    DROP COLUMN `ingredients`,
    DROP COLUMN `prepTime`;

-- AlterTable
ALTER TABLE `inventory_items` ADD COLUMN `averageCost` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `amountPaid` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `purchase_order_items` DROP COLUMN `total`,
    ADD COLUMN `subTotal` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `purchase_orders` DROP COLUMN `paidAmount`,
    DROP COLUMN `subtotal`,
    ADD COLUMN `amountPaid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `totalAmount` DECIMAL(10, 2) NOT NULL,
    MODIFY `paymentStatus` ENUM('UNPAID', 'PAID', 'PARTIAL') NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE `restaurant_tables` DROP COLUMN `note`,
    ADD COLUMN `notes` TEXT NULL,
    MODIFY `tableNumber` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `payment_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reminder_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `purchaseOrderId` INTEGER NULL,
    `amountPaid` DECIMAL(10, 2) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'Cash',
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_reminders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierId` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `hotelName` VARCHAR(191) NOT NULL DEFAULT 'Senari Chinese Hotel',
    `reportTagline` VARCHAR(191) NOT NULL DEFAULT 'Business Intelligence & Performance Report',
    `confidentialityNotice` VARCHAR(191) NOT NULL DEFAULT 'SENARI CHINESE HOTEL — Confidential',
    `currencySymbol` VARCHAR(191) NOT NULL DEFAULT 'Rs.',
    `compactTableView` BOOLEAN NOT NULL DEFAULT false,
    `darkMode` BOOLEAN NOT NULL DEFAULT true,
    `playOrderSound` BOOLEAN NOT NULL DEFAULT true,
    `autoAcceptOrders` BOOLEAN NOT NULL DEFAULT false,
    `lowStockThreshold` INTEGER NOT NULL DEFAULT 6,
    `pdfOrientation` VARCHAR(191) NOT NULL DEFAULT 'portrait',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `categories_name_type_key` ON `categories`(`name`, `type`);

-- CreateIndex
CREATE INDEX `inventory_items_createdAt_idx` ON `inventory_items`(`createdAt`);

-- CreateIndex
CREATE INDEX `orders_createdAt_idx` ON `orders`(`createdAt`);

-- CreateIndex
CREATE INDEX `purchase_orders_createdAt_idx` ON `purchase_orders`(`createdAt`);

-- CreateIndex
CREATE INDEX `restaurant_tables_tableNumber_idx` ON `restaurant_tables`(`tableNumber`);

-- AddForeignKey
ALTER TABLE `payment_records` ADD CONSTRAINT `payment_records_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reminder_history` ADD CONSTRAINT `reminder_history_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_payments` ADD CONSTRAINT `supplier_payments_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_reminders` ADD CONSTRAINT `supplier_reminders_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
