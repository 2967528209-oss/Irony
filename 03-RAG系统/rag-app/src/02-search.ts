import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import OpenAI from 'openai';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

const ollamaClient = new OpenAI({
  apiKey: 'ollama',
  baseURL: 'http://localhost:11434/v1',
});

// ========== 余弦相似度 ==========

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

// ========== 向量检索 ==========

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

async function search(query: string, topK: number = 5): Promise<SearchResult[]> {
  // 1. 加载向量存储
  const storePath = resolve(__dirname, '../data/vector-store.json');
  const store = JSON.parse(await readFile(storePath, 'utf-8'));
  const entries: VectorStoreEntry[] = store.entries;

  // 2. 将查询编码为向量
  const response = await ollamaClient.embeddings.create({
    model: 'bge-m3',
    input: query,
  });
  const queryEmbedding = response.data[0].embedding;

  // 3. 计算与每个文档块的余弦相似度
  const results: SearchResult[] = entries.map(entry => ({
    content: entry.content,
    metadata: entry.metadata,
    similarity: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  // 4. 按相似度降序排列，取 Top-K
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

// ========== 主流程 ==========

async function main() {
  const queries = [
    '什么是 RAG？',
    'Embedding 模型怎么选？',
    '如何处理 LLM 的 Rate Limit 错误？',
    'Cursor Skills 是什么？',
  ];

  console.log('=== 向量检索测试 ===\n');

  for (const query of queries) {
    console.log(`查询: "${query}"`);
    console.log('-'.repeat(50));

    const results = await search(query, 3);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      console.log(`  #${i + 1} [相似度: ${r.similarity.toFixed(4)}]`);
      console.log(`     来源: ${r.metadata.source}`);
      console.log(`     内容: ${r.content.slice(0, 100)}...`);
    }
    console.log();
  }
}

main().catch(console.error);
