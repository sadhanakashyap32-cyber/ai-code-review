import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured in environment variables.");
  }
  return new OpenAI({ apiKey });
};

/**
 * Robustly extract JSON from an AI response, handling potential markdown blocks.
 */
function extractJson(content) {
  if (!content) return null;
  // If the content is already valid JSON, return it
  try {
    return JSON.parse(content);
  } catch (e) {
    // If it fails, try to strip markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (innerError) {
        throw new Error("Failed to parse JSON even after stripping markdown blocks.");
      }
    }
    throw e; // Rethrow original error if no markdown match found
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code } = body;

    // Validate Input
    if (!code || typeof code !== "string" || code.trim() === "") {
      return NextResponse.json(
        { error: "Valid, non-empty code must be provided for review." },
        { status: 400 }
      );
    }

    let openai;
    try {
      openai = getOpenAIClient();
    } catch (configError) {
      console.error("Configuration Error:", configError.message);
      return NextResponse.json(
        { error: "Server configuration error: Missing API Key." },
        { status: 500 }
      );
    }

    const prompt = `
      Review the following piece of code.
      Return the results EXCLUSIVELY in valid JSON format with the exact following schema:
      {
        "bugs": ["bug 1", "bug 2"],
        "suggestions": ["suggestion 1", "suggestion 2"],
        "rating": 8,
        "documentation": "A short markdown description of what the code does."
      }

      Code to review:
      \`\`\`
      ${code}
      \`\`\`
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert code reviewer. You must output only a valid JSON object.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1, // Lower temperature for more consistent JSON structure
    });

    const content = response.choices[0].message.content;
    const parsedResult = extractJson(content);

    return NextResponse.json(parsedResult, { status: 200 });

  } catch (error) {
    console.error("AI Review Error:", error);
    
    // Check for specific OpenAI errors if possible
    const status = error.status || 500;
    const errorMessage = error.message || "Failed to generate code review.";

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
