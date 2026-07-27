-- AlterTable
ALTER TABLE `food_items` ADD COLUMN `ingredients` JSON NOT NULL,
    ADD COLUMN `serves` VARCHAR(191) NOT NULL DEFAULT '1-2 persons';
