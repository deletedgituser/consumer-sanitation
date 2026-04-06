-- Add a dedicated nullable number for customer follow-up/contacting only.
-- This must stay separate from the official application cellphone field.
ALTER TABLE `Application`
  ADD COLUMN `contactNumberForContacting` VARCHAR(191) NULL;
