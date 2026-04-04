import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Robustly extract JSON from an AI response, handling potential markdown blocks.
 */
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
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string" || code.trim() === "") {
      return NextResponse.json(
        { error: "Valid, non-empty code must be provided for review." },
        { status: 400 }
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

    return NextResponse.json({ ...parsedResult, isMock: false }, { status: 200 });

  } catch (error) {
    console.error("AI Review Error Details:", error);
    
    const errorMessage = error.message || "Failed to generate code review using Gemini.";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
