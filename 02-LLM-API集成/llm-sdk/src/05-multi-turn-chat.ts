/**
 * 练习 5：多轮对话 + Token 用量追踪
 *
 * 预设 3 轮对话，观察每轮 prompt tokens 的增长。
 *
 * 运行：node --import tsx src/05-multi-turn-chat.ts
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

const userQuestions = [
  '用一句话解释什么是向量数据库。',
  '它和传统关系型数据库有什么区别？',
  '在 RAG 系统中，向量数据库扮演什么角色？',
];

async function multiTurnChat() {
  console.log('=== 多轮对话 Token 追踪 ===\n');

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: '你是一个简洁的技术助手，每次回答不超过 2 句话。' },
  ];

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  for (let i = 0; i < userQuestions.length; i++) {
    const question = userQuestions[i];
    messages.push({ role: 'user', content: question });

    console.log(`--- 第 ${i + 1} 轮 ---`);
    console.log(`用户: ${question}`);

    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages,
    });

    const reply = completion.choices[0].message.content!;
    messages.push({ role: 'assistant', content: reply });

    const usage = completion.usage!;
    totalPromptTokens += usage.prompt_tokens;
    totalCompletionTokens += usage.completion_tokens;

    console.log(`AI:   ${reply}`);
    console.log(`  → Prompt: ${usage.prompt_tokens} | Completion: ${usage.completion_tokens} | Total: ${usage.total_tokens}`);
    console.log(`  → Messages 数组长度: ${messages.length}\n`);
  }

  console.log('=== 汇总 ===');
  console.log(`累计 Prompt tokens:     ${totalPromptTokens}`);
  console.log(`累计 Completion tokens: ${totalCompletionTokens}`);
  console.log(`累计 Total tokens:      ${totalPromptTokens + totalCompletionTokens}`);
  console.log(`\n注意观察：每轮的 Prompt tokens 都在增长，因为完整的对话历史每次都要发送。`);
}

multiTurnChat().catch(console.error);
