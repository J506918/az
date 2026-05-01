/**
 * AI Providers Configuration
 * 
 * This module defines the types and interfaces for supporting multiple AI providers.
 * Supported providers:
 * - builtin: Built-in server-side LLM (default)
 * - openai: OpenAI (GPT-4, GPT-3.5, etc.)
 * - deepseek: DeepSeek (Chinese AI)
 * - claude: Anthropic Claude
 * - aliyun: Alibaba Qwen
 * - baidu: Baidu Wenxin
 */

export type AIProvider = 'builtin' | 'openai' | 'deepseek' | 'claude' | 'aliyun' | 'baidu';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
}

export interface AISettings {
  defaultProvider: AIProvider;
  providers: Record<AIProvider, AIProviderConfig>;
}

/**
 * Default provider configurations
 * Each provider has sensible defaults for baseUrl and model
 */
export const DEFAULT_PROVIDER_CONFIGS: Record<AIProvider, Partial<AIProviderConfig>> = {
  builtin: {
    provider: 'builtin',
    baseUrl: undefined, // Uses server's built-in LLM
    model: 'gemini-2.5-flash',
    enabled: true,
  },
  openai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4-turbo',
    enabled: false,
  },
  deepseek: {
    provider: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    enabled: false,
  },
  claude: {
    provider: 'claude',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-3-5-sonnet-20241022',
    enabled: false,
  },
  aliyun: {
    provider: 'aliyun',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-max',
    enabled: false,
  },
  baidu: {
    provider: 'baidu',
    baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
    model: 'ernie-bot-4',
    enabled: false,
  },
};

/**
 * Provider display names and descriptions
 */
export const PROVIDER_METADATA: Record<AIProvider, { name: string; description: string }> = {
  builtin: {
    name: 'Built-in AI',
    description: 'Server-side LLM (no API key required)',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 Turbo',
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'DeepSeek Chat (Chinese)',
  },
  claude: {
    name: 'Claude',
    description: 'Anthropic Claude',
  },
  aliyun: {
    name: 'Alibaba Qwen',
    description: '阿里云通义千问',
  },
  baidu: {
    name: 'Baidu Wenxin',
    description: '百度文心一言',
  },
};

/**
 * Get default AI settings
 */
export function getDefaultAISettings(): AISettings {
  return {
    defaultProvider: 'builtin',
    providers: {
      builtin: {
        provider: 'builtin',
        enabled: true,
      } as AIProviderConfig,
      openai: {
        provider: 'openai',
        baseUrl: DEFAULT_PROVIDER_CONFIGS.openai.baseUrl,
        model: DEFAULT_PROVIDER_CONFIGS.openai.model,
        enabled: false,
      } as AIProviderConfig,
      deepseek: {
        provider: 'deepseek',
        baseUrl: DEFAULT_PROVIDER_CONFIGS.deepseek.baseUrl,
        model: DEFAULT_PROVIDER_CONFIGS.deepseek.model,
        enabled: false,
      } as AIProviderConfig,
      claude: {
        provider: 'claude',
        baseUrl: DEFAULT_PROVIDER_CONFIGS.claude.baseUrl,
        model: DEFAULT_PROVIDER_CONFIGS.claude.model,
        enabled: false,
      } as AIProviderConfig,
      aliyun: {
        provider: 'aliyun',
        baseUrl: DEFAULT_PROVIDER_CONFIGS.aliyun.baseUrl,
        model: DEFAULT_PROVIDER_CONFIGS.aliyun.model,
        enabled: false,
      } as AIProviderConfig,
      baidu: {
        provider: 'baidu',
        baseUrl: DEFAULT_PROVIDER_CONFIGS.baidu.baseUrl,
        model: DEFAULT_PROVIDER_CONFIGS.baidu.model,
        enabled: false,
      } as AIProviderConfig,
    },
  };
}
