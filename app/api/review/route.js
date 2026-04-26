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

    return NextResponse.json({ reviews, total, page, totalPages: Math.ceil(total / limit) }, { status: 200 });
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
    const prompt = "Review the following code. Return EXCLUSIVELY a JSON object with: issues (array), suggestions (array), score (number), improvedCode (string), documentation (string).\n\nCode:\n" + code;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "Expert code reviewer. Output only JSON.",
        temperature: 0.1,
      }
    });

    const parsedResult = extractJson(response.text);
    const savedReview = await prisma.review.create({
      data: {
        userId: session.user.id,
        code,
        language: language || "detect",
        review: parsedResult
      }
    });

    if (userDbInfo.plan === "FREE") await incrementUsage(session.user.id);
    return NextResponse.json({ ...parsedResult, id: savedReview.id }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
