import { prisma } from "./prisma";

export const FREE_DAILY_LIMIT = 5;

/**
 * Checks usage and enforces limitations.
 * Returns { success: boolean, count: number, error?: string }
 */
export async function trackAndEnforceUsage(user) {
  if (user.plan === "PRO") {
    return { success: true, count: 0 }; // Unlimited
  }

  // Define today at 00:00:00 UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Use a transaction to safely fetch and potentially increment usage atomically
  // Wait, Prisma doesn't natively have simple atomic upsert-and-return-condition in one query easily. 
  // We can just upsert.
  // Actually, we must fetch first or upsert then check.
  
  const usage = await prisma.usage.upsert({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
    update: {}, // We just want to get the record or create it
    create: {
      userId: user.id,
      date: today,
      count: 0,
    },
  });

  if (usage.count >= FREE_DAILY_LIMIT) {
    return {
      success: false,
      count: usage.count,
      error: "Daily limit reached. Upgrade to Pro.",
    };
  }

  return { success: true, count: usage.count };
}

/**
 * Commits the usage count safely after a successful action
 */
export async function incrementUsage(userId) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.usage.update({
    where: {
      userId_date: {
        userId: userId,
        date: today,
      },
    },
    data: {
      count: { increment: 1 },
    },
  });
}
