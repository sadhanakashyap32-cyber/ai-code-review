export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    // 1. Total Reviews
    const totalReviews = await prisma.review.count({
      where: { userId },
    });

    // 2. Reviews Today (from Usage table)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const usageToday = await prisma.usage.findUnique({
      where: { userId_date: { userId, date: today } }
    });
    const reviewsToday = usageToday?.count || 0;

    // 3. Last 7 Days Trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Includes today

    const usageHistory = await prisma.usage.findMany({
      where: {
        userId,
        date: { gte: sevenDaysAgo }
      },
      orderBy: { date: 'asc' }
    });

    // Fill missing days with 0
    const trendData = [];
    for (let i = 0; i < 7; i++) {
       const d = new Date(sevenDaysAgo);
       d.setDate(d.getDate() + i);
       
       const record = usageHistory.find(u => new Date(u.date).getTime() === d.getTime());
       trendData.push({
           name: d.toLocaleDateString('en-US', { weekday: 'short' }),
           usage: record ? record.count : 0
       });
    }

    // 4. Top Languages
    const languageGroups = await prisma.review.groupBy({
      by: ['language'],
      where: { userId },
      _count: { language: true },
      orderBy: { _count: { language: 'desc' } },
      take: 5
    });

    const topLanguages = languageGroups.map(lg => ({
      name: lg.language || 'unknown',
      count: lg._count.language
    }));

    // 5. Average reviews per day
    const distinctDays = await prisma.usage.count({
      where: { userId }
    });
    
    // Average formula: total reviews / active days (at least 1 to avoid div zero)
    const avgPerDay = distinctDays > 0 ? (totalReviews / distinctDays).toFixed(1) : 0;

    return NextResponse.json({
      plan: user?.plan || "FREE",
      totalReviews,
      reviewsToday,
      trendData,
      topLanguages,
      avgPerDay
    }, { status: 200 });

  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
