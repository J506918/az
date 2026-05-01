import { getApiBaseUrl } from "@/constants/oauth";

export interface AnalysisInput {
  logType: string;
  content: string;
}

export interface AnalysisResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Analyze logs or data using the server-side LLM via the /api/ai/chat endpoint
 * @param input - The analysis input containing logType and content
 * @returns Analysis result with success status and data or error
 */
export async function analyzeLog(input: AnalysisInput): Promise<AnalysisResult> {
  try {
    // Build the prompt based on log type
    let systemPrompt = "You are an expert at analyzing error logs and system diagnostics.";
    let userPrompt = input.content;

    // Prepare messages in the format expected by the AI chat endpoint
    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ];

    console.log("[AI Service] Calling /api/ai/chat with messages:", messages);

    // Get the API base URL
    const apiBaseUrl = getApiBaseUrl();
    const endpoint = `${apiBaseUrl}/api/ai/chat`;

    console.log("[AI Service] Endpoint:", endpoint);

    // Use fetch to call the AI chat endpoint
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        messages: messages,
      }),
    });

    console.log("[AI Service] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Service] HTTP error:", response.status, errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();
    console.log("[AI Service] Response:", JSON.stringify(result, null, 2));

    // Extract the content from the response
    const content = result.content;
    
    if (!content) {
      console.error("[AI Service] No content in response:", result);
      return {
        success: false,
        error: "No content in response",
      };
    }

    console.log("[AI Service] Extracted content:", content);
    return {
      success: true,
      data: content,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[AI Service] Analysis error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function analyzeCanData(data: string): Promise<AnalysisResult> {
  return analyzeLog({
    logType: "can",
    content: data,
  });
}
