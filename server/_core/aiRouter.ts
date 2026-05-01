import { publicProcedure, router } from "./trpc";
import { z } from "zod";
import { invokeLLM } from "./llm";

/**
 * AI Router - Handles multi-provider AI requests
 * 
 * Supports:
 * - builtin: Server-side LLM (uses environment credentials)
 * - openai: OpenAI API
 * - deepseek: DeepSeek API
 * - claude: Anthropic Claude API
 * - aliyun: Alibaba Qwen API
 * - baidu: Baidu Wenxin API
 */

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const ChatRequestSchema = z.object({
  provider: z.enum(["builtin", "openai", "deepseek", "claude", "aliyun", "baidu"]),
  messages: z.array(MessageSchema),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().optional(),
});

export const aiRouter = router({
  /**
   * Chat with AI using the specified provider
   */
  chat: publicProcedure
    .input(ChatRequestSchema)
    .mutation(async ({ input }) => {
      const { provider, messages, apiKey, baseUrl, model } = input;

      console.log(`[AI Router] Chat request - Provider: ${provider}, Has API Key: ${!!apiKey}, Base URL: ${baseUrl}, Model: ${model}`);

      try {
        if (provider === "builtin") {
          // Use server-side built-in LLM
          const result = await invokeLLM({ messages });
          return {
            success: true,
            content: result.choices?.[0]?.message?.content || "",
          };
        } else if (provider === "openai") {
          console.log("[AI Router] Calling OpenAI...");
          return await callOpenAI(messages, apiKey, baseUrl, model);
        } else if (provider === "deepseek") {
          console.log("[AI Router] Calling DeepSeek...");
          return await callDeepSeek(messages, apiKey, baseUrl, model);
        } else if (provider === "claude") {
          console.log("[AI Router] Calling Claude...");
          return await callClaude(messages, apiKey, baseUrl, model);
        } else if (provider === "aliyun") {
          console.log("[AI Router] Calling Aliyun...");
          return await callAliyun(messages, apiKey, baseUrl, model);
        } else if (provider === "baidu") {
          console.log("[AI Router] Calling Baidu...");
          return await callBaidu(messages, apiKey, baseUrl, model);
        } else {
          return {
            success: false,
            error: `Unsupported provider: ${provider}`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AI Router] Error calling ${provider}:`, errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }
    }),

  /**
   * Test connection to an AI provider
   */
  testConnection: publicProcedure
    .input(
      z.object({
        provider: z.enum(["builtin", "openai", "deepseek", "claude", "aliyun", "baidu"]),
        apiKey: z.string().optional(),
        baseUrl: z.string().optional(),
        model: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { provider, apiKey, baseUrl, model } = input;

      try {
        if (provider === "builtin") {
          // Built-in always works if server is running
          return { success: true, message: "Built-in AI is available" };
        }

        // Test with a simple message
        const testMessages = [
          {
            role: "user" as const,
            content: "Hello",
          },
        ];

        if (provider === "openai") {
          const result = await callOpenAI(testMessages, apiKey, baseUrl, model);
          return result;
        } else if (provider === "deepseek") {
          const result = await callDeepSeek(testMessages, apiKey, baseUrl, model);
          return result;
        } else if (provider === "claude") {
          const result = await callClaude(testMessages, apiKey, baseUrl, model);
          return result;
        } else if (provider === "aliyun") {
          const result = await callAliyun(testMessages, apiKey, baseUrl, model);
          return result;
        } else if (provider === "baidu") {
          const result = await callBaidu(testMessages, apiKey, baseUrl, model);
          return result;
        } else {
          return {
            success: false,
            error: `Unsupported provider: ${provider}`,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    }),
});

// ─── Provider Implementations ──────────────────────────────────────────────────

async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  apiKey?: string,
  baseUrl?: string,
  model?: string
) {
  if (!apiKey) {
    console.error("[OpenAI] API key is missing");
    return { success: false, error: "OpenAI API key is required" };
  }

  const url = `${baseUrl || "https://api.openai.com/v1"}/chat/completions`;
  console.log(`[OpenAI] Calling ${url} with model ${model || "gpt-4-turbo"}`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4-turbo",
      messages,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[OpenAI] API error: ${response.status} - ${error}`);
    return {
      success: false,
      error: `OpenAI API error: ${response.status} - ${error}`,
    };
  }
  console.log("[OpenAI] API call successful");

  const data = await response.json();
  return {
    success: true,
    content: data.choices?.[0]?.message?.content || "",
  };
}

async function callDeepSeek(
  messages: Array<{ role: string; content: string }>,
  apiKey?: string,
  baseUrl?: string,
  model?: string
) {
  if (!apiKey) {
    console.error("[DeepSeek] API key is missing");
    return { success: false, error: "DeepSeek API key is required" };
  }

  const url = `${baseUrl || "https://api.deepseek.com/v1"}/chat/completions`;
  console.log(`[DeepSeek] Calling ${url} with model ${model || "deepseek-chat"}`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "deepseek-chat",
      messages,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[DeepSeek] API error: ${response.status} - ${error}`);
    return {
      success: false,
      error: `DeepSeek API error: ${response.status} - ${error}`,
    };
  }
  console.log("[DeepSeek] API call successful");

  const data = await response.json();
  return {
    success: true,
    content: data.choices?.[0]?.message?.content || "",
  };
}

async function callClaude(
  messages: Array<{ role: string; content: string }>,
  apiKey?: string,
  baseUrl?: string,
  model?: string
) {
  if (!apiKey) {
    return { success: false, error: "Claude API key is required" };
  }

  // Claude uses a different API format
  const url = `${baseUrl || "https://api.anthropic.com"}/v1/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return {
      success: false,
      error: `Claude API error: ${response.status} - ${error}`,
    };
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || "";
  return {
    success: true,
    content,
  };
}

async function callAliyun(
  messages: Array<{ role: string; content: string }>,
  apiKey?: string,
  baseUrl?: string,
  model?: string
) {
  if (!apiKey) {
    return { success: false, error: "Alibaba Qwen API key is required" };
  }

  const url = `${baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1"}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "qwen-max",
      messages,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return {
      success: false,
      error: `Alibaba Qwen API error: ${response.status} - ${error}`,
    };
  }

  const data = await response.json();
  return {
    success: true,
    content: data.choices?.[0]?.message?.content || "",
  };
}

async function callBaidu(
  messages: Array<{ role: string; content: string }>,
  apiKey?: string,
  baseUrl?: string,
  model?: string
) {
  if (!apiKey) {
    return { success: false, error: "Baidu Wenxin API key is required" };
  }

  // Baidu uses a different format - need to parse the key for access token
  // This is a simplified implementation
  const url = `${baseUrl || "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop"}/chat/ernie`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      model: model || "ernie-bot-4",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return {
      success: false,
      error: `Baidu Wenxin API error: ${response.status} - ${error}`,
    };
  }

  const data = await response.json();
  return {
    success: true,
    content: data.result || "",
  };
}
