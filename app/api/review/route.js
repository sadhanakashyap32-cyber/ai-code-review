export const dynamic = "force-dynamic";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { trackAndEnforceUsage, incrementUsage } from "../../../lib/usageTracker";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey });
};

const isSqlite = () => process.env.DATABASE_URL?.startsWith("file:");

function extractJson(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (e) {
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (innerError) {
        throw new Error("Failed to parse JSON.");
      }
    }
    throw e;
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { userId: session.user.id } })
    ]);

    const processedReviews = reviews.map(r => ({
      ...r,
      review: (isSqlite() && typeof r.review === 'string') ? JSON.parse(r.review) : r.review
    }));

    return NextResponse.json({ reviews: processedReviews, total, page, totalPages: Math.ceil(total / limit) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { code, language } = await request.json();
    if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

    const userDbInfo = await prisma.user.findUnique({ where: { id: session.user.id } });
    const usageCheck = await trackAndEnforceUsage(userDbInfo);
    if (!usageCheck.success) return NextResponse.json({ error: usageCheck.error }, { status: 403 });

    const ai = getGeminiClient();
    
    const prompt = `Review the following code. Return EXCLUSIVELY a JSON object with: 
    issues (array of {type: string, description: string}), 
    suggestions (array of strings), 
    score (number 0-100), 
    improvedCode (string), 
    documentation (string).

    Code:
    ${code}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert code reviewer. You must output only a valid JSON object matching the requested schema.",
        temperature: 0.1,
      }
    });

    const parsedResult = extractJson(response.text);

    const savedReview = await prisma.review.create({
      data: {
        userId: session.user.id,
        code,
        language: language || "detect",
        review: isSqlite() ? JSON.stringify(parsedResult) : parsedResult
      }
    });

    if (userDbInfo.plan === "FREE") await incrementUsage(session.user.id);
    return NextResponse.json({ ...parsedResult, id: savedReview.id }, { status: 200 });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
