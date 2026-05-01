import { getApiBaseUrl } from "@/constants/oauth";
import { AIProvider, AIProviderConfig } from "./ai-providers";

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
 * Analyze logs or data using a specific AI provider
 * @param input - The analysis input containing logType and content
 * @param provider - The AI provider to use
 * @param config - The provider configuration (API key, base URL, model)
 * @returns Analysis result with success status and data or error
 */
export async function analyzeLogWithProvider(
  input: AnalysisInput,
  provider: AIProvider,
  config: AIProviderConfig
): Promise<AnalysisResult> {
  try {
    // Build the prompt based on log type
    let systemPrompt = "You are an expert at analyzing error logs and system diagnostics.";
    let userPrompt = input.content;

    // Prepare messages in the format expected by the AI chat endpoint
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      {
        role: "user" as const,
        content: userPrompt,
      },
    ];

    console.log("[AI Client] Calling AI provider:", provider, "with config:", {
      ...config,
      apiKey: config.apiKey ? "***" : undefined,
    });

    // Get the API base URL
    const apiBaseUrl = getApiBaseUrl();
    const endpoint = `${apiBaseUrl}/api/trpc/ai.chat`;

    console.log("[AI Client] Endpoint:", endpoint);

    // Use fetch to call the AI chat endpoint
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        json: {
          provider,
          messages,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
        },
      }),
    });

    console.log("[AI Client] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Client] HTTP error:", response.status, errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();
    console.log("[AI Client] Response:", JSON.stringify(result, null, 2));

    // Extract the content from the tRPC response
    const content = result.result?.data?.json?.content;

    if (!content) {
      console.error("[AI Client] No content in response:", result);
      return {
        success: false,
        error: "No content in response",
      };
    }

    console.log("[AI Client] Extracted content:", content);
    return {
      success: true,
      data: content,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[AI Client] Analysis error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Test connection to an AI provider
 * @param provider - The AI provider to test
 * @param config - The provider configuration
 * @returns Test result
 */
export async function testAiProviderConnection(
  provider: AIProvider,
  config: AIProviderConfig
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const endpoint = `${apiBaseUrl}/api/trpc/ai.testConnection`;

    console.log("[AI Client] Testing connection to provider:", provider);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        json: {
          provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Client] Test connection error:", response.status, errorText);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();
    const testResult = result.result?.data?.json;

    if (testResult?.success) {
      return {
        success: true,
        message: testResult.message || "Connection successful",
      };
    } else {
      return {
        success: false,
        error: testResult?.error || "Connection failed",
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[AI Client] Test connection error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Legacy function for backward compatibility
 * Uses the default provider from store
 */
export async function analyzeLog(input: AnalysisInput): Promise<AnalysisResult> {
  // This function is kept for backward compatibility
  // It will be called with the default provider from the store
  try {
    const apiBaseUrl = getApiBaseUrl();
    const endpoint = `${apiBaseUrl}/api/ai/chat`;

    const messages = [
      {
        role: "system",
        content: "You are an expert at analyzing error logs and system diagnostics.",
      },
      {
        role: "user",
        content: input.content,
      },
    ];

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const result = await response.json();
    const content = result.content;

    if (!content) {
      return {
        success: false,
        error: "No content in response",
      };
    }

    return {
      success: true,
      data: content,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
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
