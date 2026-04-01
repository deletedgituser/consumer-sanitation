-- Prisma @updatedAt: no DB-level DEFAULT / ON UPDATE (matches introspection + migrate dev shadow)
ALTER TABLE `user` MODIFY `updatedAt` DATETIME(3) NOT NULL;
