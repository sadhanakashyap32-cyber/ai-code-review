import { PrismaClient } from "@prisma/client";

const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma ||
  (process.env.DATABASE_URL ? new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }) : null);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
