import { PrismaClient } from "../app/generated/prisma/client"

const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient({} as any)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
export default prisma