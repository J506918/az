/**
 * Diagnostic script to test AI provider calls
 * Run with: npx tsx scripts/test-ai-provider.ts
 */

const API_BASE_URL = 'http://localhost:3000';

interface AIRequest {
  provider: 'builtin' | 'openai' | 'deepseek' | 'claude' | 'aliyun' | 'baidu';
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

async function testAIProvider(request: AIRequest) {
  console.log('\n' + '='.repeat(60));
  console.log(`Testing AI Provider: ${request.provider}`);
  console.log('='.repeat(60));

  const endpoint = `${API_BASE_URL}/api/trpc/ai.chat`;

  console.log(`\nEndpoint: ${endpoint}`);
  console.log(`Provider: ${request.provider}`);
  console.log(`Has API Key: ${!!request.apiKey}`);
  console.log(`Base URL: ${request.baseUrl || 'default'}`);
  console.log(`Model: ${request.model || 'default'}`);

  const payload = {
    json: {
      provider: request.provider,
      messages: request.messages,
      apiKey: request.apiKey,
      baseUrl: request.baseUrl,
      model: request.model,
    },
  };

  console.log(`\nRequest Payload:`, JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(`\nResponse Status: ${response.status}`);

    const text = await response.text();
    console.log(`\nResponse Body (first 500 chars):`, text.substring(0, 500));

    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log(`\nParsed Response:`, JSON.stringify(data, null, 2));

        const content = data.result?.data?.json?.content;
        if (content) {
          console.log(`\n✅ SUCCESS - Content received:`);
          console.log(content.substring(0, 200));
        } else {
          console.log(`\n⚠️ WARNING - No content in response`);
          console.log(`Full response:`, JSON.stringify(data, null, 2));
        }
      } catch (e) {
        console.log(`\n❌ ERROR - Failed to parse response as JSON`);
        console.log(`Error:`, e instanceof Error ? e.message : String(e));
      }
    } else {
      console.log(`\n❌ ERROR - HTTP ${response.status}`);
    }
  } catch (error) {
    console.log(`\n❌ ERROR - ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runTests() {
  console.log('AI Provider Diagnostic Test Suite');
  console.log('='.repeat(60));

  // Test 1: Built-in AI (should always work)
  await testAIProvider({
    provider: 'builtin',
    messages: [
      { role: 'user', content: 'Hello, what is 2+2?' },
    ],
  });

  // Test 2: OpenAI (requires valid API key)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    await testAIProvider({
      provider: 'openai',
      messages: [
        { role: 'user', content: 'Hello, what is 2+2?' },
      ],
      apiKey: openaiKey,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4-turbo',
    });
  } else {
    console.log('\n⚠️ Skipping OpenAI test - OPENAI_API_KEY not set');
  }

  // Test 3: DeepSeek (requires valid API key)
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    await testAIProvider({
      provider: 'deepseek',
      messages: [
        { role: 'user', content: 'Hello, what is 2+2?' },
      ],
      apiKey: deepseekKey,
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    });
  } else {
    console.log('\n⚠️ Skipping DeepSeek test - DEEPSEEK_API_KEY not set');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Suite Complete');
  console.log('='.repeat(60));
  console.log('\nTo test with your own API keys, set environment variables:');
  console.log('  export OPENAI_API_KEY=sk-...');
  console.log('  export DEEPSEEK_API_KEY=sk-...');
  console.log('  npx tsx scripts/test-ai-provider.ts');
}

runTests().catch(console.error);
