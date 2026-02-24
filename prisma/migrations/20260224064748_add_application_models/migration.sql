/*
  Warnings:

  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `username` on table `user` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `role` ENUM('ADMIN', 'STAFF', 'VIEWER') NOT NULL DEFAULT 'ADMIN',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    MODIFY `username` VARCHAR(191) NOT NULL,
    MODIFY `password` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `Application` (
    `id` VARCHAR(191) NOT NULL,
    `recordNumber` VARCHAR(191) NOT NULL,
    `appType` ENUM('NEW', 'CHANGE') NOT NULL,
    `membership` ENUM('HOUSEHOLD', 'CORPORATE') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'DECLINED', 'SIGNED_UP') NOT NULL DEFAULT 'PENDING',
    `area` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `barangay` VARCHAR(191) NOT NULL,
    `residenceAddress` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `suffixName` VARCHAR(191) NULL,
    `birthdate` VARCHAR(191) NOT NULL,
    `noMiddleName` BOOLEAN NOT NULL DEFAULT false,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `civilStatus` VARCHAR(191) NOT NULL,
    `spouseFirst` VARCHAR(191) NULL,
    `spouseMiddle` VARCHAR(191) NULL,
    `spouseLast` VARCHAR(191) NULL,
    `spouseSuffix` VARCHAR(191) NULL,
    `spouseBirthdate` VARCHAR(191) NULL,
    `cellphone` VARCHAR(191) NOT NULL,
    `landline` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `privacyConsent` BOOLEAN NOT NULL DEFAULT false,
    `privacyNewsletter` BOOLEAN NOT NULL DEFAULT false,
    `privacyEmail` BOOLEAN NOT NULL DEFAULT false,
    `privacySms` BOOLEAN NOT NULL DEFAULT false,
    `privacyPhone` BOOLEAN NOT NULL DEFAULT false,
    `privacySocial` BOOLEAN NOT NULL DEFAULT false,
    `cosignatory` VARCHAR(191) NULL,
    `witness` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `orNumber` VARCHAR(191) NULL,
    `dateIssued` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `declinedAt` DATETIME(3) NULL,
    `declineReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `updatedById` VARCHAR(191) NULL,

    UNIQUE INDEX `Application_recordNumber_key`(`recordNumber`),
    INDEX `Application_recordNumber_idx`(`recordNumber`),
    INDEX `Application_status_idx`(`status`),
    INDEX `Application_appType_idx`(`appType`),
    INDEX `Application_membership_idx`(`membership`),
    INDEX `Application_area_idx`(`area`),
    INDEX `Application_district_idx`(`district`),
    INDEX `Application_barangay_idx`(`barangay`),
    INDEX `Application_createdAt_idx`(`createdAt`),
    INDEX `Application_lastName_firstName_idx`(`lastName`, `firstName`),
    INDEX `Application_createdById_idx`(`createdById`),
    INDEX `Application_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `type` ENUM('APPLICANT_PHOTO', 'SPOUSE_PHOTO', 'VALID_ID', 'PROOF_OF_RESIDENCY', 'MARRIAGE_CERTIFICATE', 'BIRTH_CERTIFICATE', 'OTHER') NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `uploadedBy` VARCHAR(191) NULL,

    INDEX `Document_applicationId_idx`(`applicationId`),
    INDEX `Document_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `action` ENUM('APPLICATION_CREATED', 'APPLICATION_UPDATED', 'APPLICATION_APPROVED', 'APPLICATION_DECLINED', 'APPLICATION_DELETED', 'STATUS_CHANGED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED', 'USER_LOGIN', 'USER_LOGOUT', 'SETTINGS_CHANGED') NOT NULL,
    `description` TEXT NOT NULL,
    `userId` VARCHAR(191) NULL,
    `userEmail` VARCHAR(191) NULL,
    `applicationId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_userId_idx`(`userId`),
    INDEX `ActivityLog_applicationId_idx`(`applicationId`),
    INDEX `ActivityLog_action_idx`(`action`),
    INDEX `ActivityLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Area` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Area_name_key`(`name`),
    UNIQUE INDEX `Area_code_key`(`code`),
    INDEX `Area_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `District` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `areaId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `District_areaId_idx`(`areaId`),
    INDEX `District_name_idx`(`name`),
    UNIQUE INDEX `District_name_areaId_key`(`name`, `areaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Barangay` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `districtId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Barangay_districtId_idx`(`districtId`),
    INDEX `Barangay_name_idx`(`name`),
    UNIQUE INDEX `Barangay_name_districtId_key`(`name`, `districtId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `User_username_idx` ON `User`(`username`);

-- CreateIndex
CREATE INDEX `User_email_idx` ON `User`(`email`);

-- AddForeignKey
ALTER TABLE `Application` ADD CONSTRAINT `Application_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Application` ADD CONSTRAINT `Application_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `District` ADD CONSTRAINT `District_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `Area`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Barangay` ADD CONSTRAINT `Barangay_districtId_fkey` FOREIGN KEY (`districtId`) REFERENCES `District`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
