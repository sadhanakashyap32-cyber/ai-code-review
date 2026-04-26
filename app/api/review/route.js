import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { trackAndEnforceUsage, incrementUsage } from "../../../lib/usageTracker";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
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
        throw new Error("Failed to parse JSON even after stripping markdown blocks.");
      }
    }
    throw e;
  }
}

// Fetch user's reviews
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

    return NextResponse.json({
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }, { status: 200 });

  } catch (error) {
    console.error("Fetch Reviews Error:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const body = await request.json();
    const { code, language } = body;

    if (!code || typeof code !== "string" || code.trim() === "") {
      return NextResponse.json(
        { error: "Valid, non-empty code must be provided for review." },
        { status: 400 }
      );
    }

    // Step 1: Enforce Daily Usage Limits before AI call
    const userDbInfo = await prisma.user.findUnique({ where: { id: session.user.id } });
    const usageCheck = await trackAndEnforceUsage(userDbInfo);
    
    if (!usageCheck.success) {
      return NextResponse.json(
        { error: usageCheck.error },
        { status: 403 }
      );
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (configError) {
      console.error("Configuration Error:", configError.message);
      return NextResponse.json(
        { error: "Server configuration error: Missing Gemini API Key." },
        { status: 500 }
      );
    }

    const prompt = `
      Review the following piece of code. Provide a professional, academic-level code review.
      Return the results EXCLUSIVELY in valid JSON format with the exact following schema:
      {
        "issues": [
          { "type": "Bug | Performance | Readability | Security | Best Practice", "description": "Detailed description of the issue" }
        ],
        "suggestions": ["Actionable suggestion 1", "Actionable suggestion 2"],
        "score": 85, 
        "improvedCode": "The fully refactored and improved version of the code",
        "documentation": "A short markdown description of what the code does."
      }
      Note: score should be between 0 and 100.

      Code to review:
      \`\`\`
      ${code}
      \`\`\`
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert code reviewer. You must output only a valid JSON object matching the requested schema.",
        temperature: 0.1,
      }
    });

    const content = response.text;
    const parsedResult = extractJson(content);

    // Save to Database
    const savedReview = await prisma.review.create({
      data: {
        userId: session.user.id,
        code: code,
        language: language || "detect",
        review: parsedResult
      }
    });

    // Step 2: Increment usage count after successful operation if user is on FREE tier
    if (userDbInfo.plan === "FREE") {
      await incrementUsage(session.user.id);
    }

    return NextResponse.json({ ...parsedResult, id: savedReview.id, isMock: false }, { status: 200 });

  } catch (error) {
    console.error("AI Review Error Details:", error);
    const errorMessage = error.message || "Failed to generate code review using Gemini.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

