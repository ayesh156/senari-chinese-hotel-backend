-- Add AuditLog table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `userId` INT NULL,
  `userName` VARCHAR(255) NOT NULL DEFAULT '',
  `userRole` VARCHAR(50) NOT NULL DEFAULT '',
  `action` VARCHAR(50) NOT NULL,
  `entity` VARCHAR(100) NOT NULL,
  `entityId` VARCHAR(100) NULL,
  `details` JSON NULL,
  `ipAddress` VARCHAR(45) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `audit_logs_createdAt_idx` (`createdAt` DESC),
  INDEX `audit_logs_action_idx` (`action`),
  INDEX `audit_logs_entity_idx` (`entity`),
  INDEX `audit_logs_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;