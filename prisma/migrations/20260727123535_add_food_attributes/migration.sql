-- AlterTable
ALTER TABLE `food_items` ADD COLUMN `calories` INTEGER NOT NULL DEFAULT 450,
    ADD COLUMN `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isHealthy` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `prepTimeMinutes` INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE `system_settings` MODIFY `lowStockThreshold` INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'MANAGER', 'CASHIER', 'STAFF') NOT NULL DEFAULT 'STAFF';

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `userName` VARCHAR(191) NOT NULL DEFAULT '',
    `userRole` VARCHAR(191) NOT NULL DEFAULT '',
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_createdAt_idx`(`createdAt` DESC),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
