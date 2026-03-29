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
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    const parsedResult = extractJson(content);

    return NextResponse.json({ ...parsedResult, isMock: false }, { status: 200 });

  } catch (error) {
    console.error("AI Review Error Details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });

    // Provide mock data if quota exceeded (429) or connection issues
    const shouldFallback = 
      error.status === 429 || 
      error.code === 'insufficient_quota' ||
      error.message?.toLowerCase().includes("quota") || 
      error.message?.toLowerCase().includes("connection error") ||
      error.message?.toLowerCase().includes("fetch") ||
      error.message?.includes("429");

    if (shouldFallback) {
      console.log("Error detected. Triggering mock data fallback.");
      const mockResult = {
        bugs: [
          "Potential memory leak in effect cleanup handler.",
          "Missing error handling for the fetch operation.",
          "Inconsistent state updates may cause race conditions."
        ],
        suggestions: [
          "Use useMemo for expensive calculations to improve performance.",
          "Implement debouncing on the input field to reduce API calls.",
          "Extract the API logic into a separate custom hook for better modularity."
        ],
        rating: 7,
        documentation: "This code implements a basic user interface with interactive elements and data fetching capabilities. It uses standard React hooks for state management and layout components.",
        isMock: true
      };

      return NextResponse.json(mockResult, { status: 200 });
    }
    
    const status = error.status || 500;
    const errorMessage = error.message || "Failed to generate code review.";

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
