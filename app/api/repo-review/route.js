import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";
import { trackAndEnforceUsage, incrementUsage } from "../../../lib/usageTracker";
import { fetchGithubRepoData } from "../../../lib/github";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  // gemini-2.5-flash has an enormous context window 
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

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const { repoUrl } = await request.json();

    if (!repoUrl || typeof repoUrl !== "string" || !repoUrl.includes("github.com")) {
      return NextResponse.json(
        { error: "Valid public GitHub URL must be provided." },
        { status: 400 }
      );
    }

    // Step 1: Enforce Usage Limit
    const userDbInfo = await prisma.user.findUnique({ where: { id: session.user.id } });
    const usageCheck = await trackAndEnforceUsage(userDbInfo);
    
    if (!usageCheck.success) {
      return NextResponse.json(
        { error: usageCheck.error },
        { status: 403 }
      );
    }

    // Step 2: Fetch Repository Payload
    const repoData = await fetchGithubRepoData(repoUrl);

    let ai;
    try {
      ai = getGeminiClient();
    } catch (configError) {
      return NextResponse.json(
        { error: "Server configuration error: Missing Gemini API Key." },
        { status: 500 }
      );
    }

    // Step 3: Run AI Analysis
    const prompt = \`
      Review the following GitHub repository source files. Provide a professional code review.
      Return the results EXCLUSIVELY in valid JSON format with the exact following schema:
      {
        "issues": [
          { "type": "Bug | Performance | Security | Best Practice", "description": "Detailed description of the issue" }
        ],
        "suggestions": ["Actionable architecture/structure suggestion 1", "Actionable suggestion 2"],
        "score": 85, 
        "summary": "A concise executive summary of the repository's health, architecture, and overall quality.",
        "fileBreakdown": [
          { "filename": "src/example.js", "issues": "Specific issues found in this file" }
        ]
      }
      Note: score should be between 0 and 100. Provide maximum 10 most critical file breakdowns.

      Repository Code Payload:
      \${repoData.combinedCode}
    \`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are an expert repository reviewer. You must output only a valid JSON object matching the requested schema.",
        temperature: 0.1,
      }
    });

    const parsedResult = extractJson(response.text);

    // Add metadata payload warning logic to the response if truncated
    if (repoData.isTruncated) {
       parsedResult.isTruncated = true;
       parsedResult.truncationWarning = \`Repository too large. Analyzed \${repoData.filesAnalyzed} priority files.\`;
    }

    // Save to Database mapping to Review model
    const savedReview = await prisma.review.create({
      data: {
        userId: session.user.id,
        code: repoData.combinedCode.substring(0, 5000), // Only save sample structure so dashboard doesn't lag 
        language: "multi",
        review: parsedResult,
        repoUrl: repoUrl,
        type: "repo",
        repoSize: repoData.repoSize,
        filesAnalyzed: repoData.filesAnalyzed
      }
    });

    if (userDbInfo.plan === "FREE") {
      await incrementUsage(session.user.id);
    }

    return NextResponse.json({ ...parsedResult, id: savedReview.id }, { status: 200 });

  } catch (error) {
    console.error("Repo Review Error:", error);
    const errorMessage = error.message || "Failed to analyze repository.";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
