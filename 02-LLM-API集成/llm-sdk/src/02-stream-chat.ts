/**
 * 练习 2：流式对话
 * 用 DeepSeek API 实现流式输出，观察 chunk 结构。
 *
 * 运行：pnpm demo:stream
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

async function streamChat() {
  console.log('--- 流式对话 ---\n');
  console.log('AI: ');

  const stream = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: '你是一个技术教学助手。' },
      { role: 'user', content: '用 3 个步骤解释 Embedding 的工作原理。' },
    ],
    stream: true,
  });

  let totalContent = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    process.stdout.write(delta);
    totalContent += delta;

    // 当收到结束信号时，打印完成原因
    if (chunk.choices[0]?.finish_reason) {
      console.log(`\n\n--- 完成 ---`);
      console.log(`Finish reason: ${chunk.choices[0].finish_reason}`);
    }
  }

  console.log(`Total chars: ${totalContent.length}`);
}

streamChat().catch(console.error);
