-- Customer portal: persist which application category the user chose (landing page).
ALTER TABLE `Application` ADD COLUMN `customerUpdateReason` VARCHAR(191) NULL;
