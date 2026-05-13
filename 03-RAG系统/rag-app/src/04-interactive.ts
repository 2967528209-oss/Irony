import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { createInterface } from 'readline';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

const ollamaClient = new OpenAI({
  apiKey: 'ollama',
  baseURL: 'http://localhost:11434/v1',
});

interface VectorStoreEntry {
  content: string;
  metadata: { source: string; title: string; chunkIndex: number };
  embedding: number[];
}

let cachedEntries: VectorStoreEntry[] | null = null;

async function getEntries(): Promise<VectorStoreEntry[]> {
  if (cachedEntries) return cachedEntries;
  const storePath = resolve(__dirname, '../data/vector-store.json');
  const store = JSON.parse(await readFile(storePath, 'utf-8'));
  cachedEntries = store.entries;
  return cachedEntries!;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function ragAnswer(question: string) {
  const entries = await getEntries();

  const embResp = await ollamaClient.embeddings.create({
    model: 'bge-m3',
    input: question,
  });
  const qVec = embResp.data[0].embedding;

  const scored = entries
    .map(e => ({ ...e, similarity: cosineSimilarity(qVec, e.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  console.log('\n📎 检索到的文档:');
  scored.forEach((r, i) => {
    const shortSource = r.metadata.source.replace(/^\.\.\/\.\.\/\.\.\//, '');
    console.log(`  [来源${i + 1}] ${shortSource} (${r.similarity.toFixed(4)})`);
  });

  const context = scored
    .map((doc, i) => `[来源${i + 1}] (${doc.metadata.source.replace(/^\.\.\/\.\.\/\.\.\//, '')})\n${doc.content}`)
    .join('\n\n---\n\n');

  const stream = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个知识库助手。基于提供的参考资料回答用户问题。
规则：
1. 只基于参考资料回答，不要编造
2. 每个事实性陈述后用 [来源N] 标注引用
3. 如果资料不足以回答，明确说明
4. 保持简洁清晰`,
      },
      { role: 'user', content: `参考资料：\n${context}\n\n用户问题：${question}` },
    ],
    temperature: 0.3,
    stream: true,
  });

  console.log('\n💬 回答:\n');
  for await (const chunk of stream) {
    const c = chunk.choices[0]?.delta?.content;
    if (c) process.stdout.write(c);
  }
  console.log('\n');
}

async function main() {
  console.log('=== RAG 交互式问答 ===');
  console.log('输入问题后回车，输入 q 退出\n');

  await getEntries();
  console.log('向量库已加载，准备就绪。\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = () => {
    rl.question('❓ 你的问题: ', async (input) => {
      const q = input.trim();
      if (!q || q === 'q' || q === 'exit' || q === 'quit') {
        console.log('再见！');
        rl.close();
        return;
      }
      try {
        await ragAnswer(q);
      } catch (err: any) {
        console.error(`错误: ${err.message}`);
      }
      ask();
    });
  };

  ask();
}

main().catch(console.error);
