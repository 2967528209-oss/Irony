/**
 * 练习 4：流式进阶 — 时间统计 + 中断能力
 *
 * 观察每个 chunk 的到达间隔，并在 5 秒后自动中断。
 *
 * 运行：node --import tsx src/04-stream-advanced.ts
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

async function streamWithMetrics() {
  console.log('--- 流式进阶：时间统计 + 5秒自动中断 ---\n');

  const controller = new AbortController();
  const startTime = Date.now();

  // 5 秒后自动中断
  const timeout = setTimeout(() => {
    console.log('\n\n⏹ 5 秒到达，自动中断！');
    controller.abort();
  }, 5000);

  try {
    const stream = await client.chat.completions.create(
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'user', content: '详细解释什么是 Transformer 架构，以及它为什么革命性。' },
        ],
        stream: true,
      },
      { signal: controller.signal },
    );

    let chunkCount = 0;
    let totalChars = 0;
    let lastChunkTime = startTime;

    process.stdout.write('AI: ');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (!content) continue;

      chunkCount++;
      totalChars += content.length;

      const now = Date.now();
      const interval = now - lastChunkTime;
      lastChunkTime = now;

      process.stdout.write(content);

      // 每 20 个 chunk 打印一次统计
      if (chunkCount % 20 === 0) {
        process.stdout.write(`\n  [chunk #${chunkCount}, interval: ${interval}ms]\n`);
      }
    }

    clearTimeout(timeout);
    console.log('\n\n--- 完整输出 ---');
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      // 预期的中断，不是错误
    } else {
      throw err;
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`\n--- 统计 ---`);
  console.log(`总耗时: ${elapsed}ms`);
  console.log(`首字延迟: ~${Date.now() - startTime < 1000 ? '< 1s' : Math.round(elapsed / 1000) + 's'}`);
}

streamWithMetrics().catch(console.error);
