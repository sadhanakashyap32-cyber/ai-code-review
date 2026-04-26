import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { FREE_DAILY_LIMIT } from "../../../lib/usageTracker";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true }
    });

    if (user?.plan === "PRO") {
      return NextResponse.json({ plan: "PRO", max: "unlimited" });
    }

    // FREE plan: Get today's usage
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const usage = await prisma.usage.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        }
      }
    });

    return NextResponse.json({
      plan: "FREE",
      used: usage?.count || 0,
      max: FREE_DAILY_LIMIT
    });

  } catch (error) {
    console.error("Fetch Usage Error:", error);
    return NextResponse.json({ error: "Failed to fetch usage data" }, { status: 500 });
  }
}
