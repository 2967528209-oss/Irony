/**
 * 练习 1：基础对话
 * 用 DeepSeek API 发送一条消息，获取回复。
 *
 * 运行：pnpm demo:basic
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

async function basicChat() {
  console.log('--- 基础对话 ---\n');

  const completion = await client.chat.completions.create({
    model: 'deepseek-v4-pro',
    messages: [
      { role: 'system', content: '你是一个简洁的技术助手，回答控制在 3 句话以内。' },
      { role: 'user', content: '你是谁，可以为我做什么？' },
    ],
    temperature: 0.7,
  });

  const message = completion.choices[0].message;
  console.log(`AI: ${message.content}`);
  console.log(`\n--- Token 用量 ---`);
  console.log(`Prompt tokens:     ${completion.usage?.prompt_tokens}`);
  console.log(`Completion tokens: ${completion.usage?.completion_tokens}`);
  console.log(`Total tokens:      ${completion.usage?.total_tokens}`);
}

basicChat().catch(console.error);
