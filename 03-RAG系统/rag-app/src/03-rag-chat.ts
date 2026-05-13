import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
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

// ========== 工具函数 ==========

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface VectorStoreEntry {
  content: string;
  metadata: { source: string; title: string; chunkIndex: number };
  embedding: number[];
}

interface SearchResult {
  content: string;
  metadata: VectorStoreEntry['metadata'];
  similarity: number;
}

// ========== 检索 ==========

async function retrieve(query: string, topK: number = 3): Promise<SearchResult[]> {
  const storePath = resolve(__dirname, '../data/vector-store.json');
  const store = JSON.parse(await readFile(storePath, 'utf-8'));
  const entries: VectorStoreEntry[] = store.entries;

  const response = await ollamaClient.embeddings.create({
    model: 'bge-m3',
    input: query,
  });
  const queryEmbedding = response.data[0].embedding;

  const results: SearchResult[] = entries.map(entry => ({
    content: entry.content,
    metadata: entry.metadata,
    similarity: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

// ========== RAG 生成 ==========

async function ragChat(question: string) {
  console.log(`\n问题: ${question}`);
  console.log('='.repeat(60));

  // 1. 检索
  console.log('\n📎 检索相关文档...');
  const docs = await retrieve(question, 3);

  for (let i = 0; i < docs.length; i++) {
    console.log(`  [来源${i + 1}] ${docs[i].metadata.source} (相似度: ${docs[i].similarity.toFixed(4)})`);
  }

  // 2. 构造带引用的 Prompt
  const context = docs
    .map((doc, i) => `[来源${i + 1}] (${doc.metadata.source})\n${doc.content}`)
    .join('\n\n---\n\n');

  const systemPrompt = `你是一个知识库助手。基于提供的参考资料回答用户问题。

规则：
1. 只基于参考资料回答，不要编造
2. 每个事实性陈述后用 [来源N] 标注引用
3. 如果资料不足以回答，明确说明
4. 保持简洁，控制在 200 字以内`;

  const userPrompt = `参考资料：
${context}

用户问题：${question}`;

  // 3. LLM 生成（流式）
  console.log('\n💬 生成回答...\n');

  const stream = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) process.stdout.write(content);
  }

  console.log('\n');
}

// ========== 主流程 ==========

async function main() {
  console.log('=== RAG 知识库问答 ===');

  const questions = [
    '什么是 RAG？它解决了什么问题？',
    'Embedding 模型应该怎么选择？',
    '处理 LLM API 的错误有哪些策略？',
  ];

  for (const q of questions) {
    await ragChat(q);
  }
}

main().catch(console.error);
