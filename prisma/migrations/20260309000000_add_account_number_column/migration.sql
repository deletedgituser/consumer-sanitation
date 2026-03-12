-- Add accountNumber column to Application (nullable first for existing rows)
ALTER TABLE `Application` ADD COLUMN `accountNumber` VARCHAR(191) NULL;

-- Backfill: set accountNumber = 'ACC-' + recordNumber for existing rows
UPDATE `Application` SET `accountNumber` = CONCAT('ACC-', `recordNumber`) WHERE `accountNumber` IS NULL;

-- Add unique index (MySQL allows multiple NULLs in UNIQUE)
CREATE UNIQUE INDEX `Application_accountNumber_key` ON `Application`(`accountNumber`);
