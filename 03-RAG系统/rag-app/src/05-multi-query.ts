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

async function vectorSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
  const entries = await getEntries();
  const resp = await ollamaClient.embeddings.create({ model: 'bge-m3', input: query });
  const qVec = resp.data[0].embedding;

  return entries
    .map(e => ({ content: e.content, metadata: e.metadata, similarity: cosineSimilarity(qVec, e.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// ========== Multi-query: 让 LLM 生成查询变体 ==========

async function generateQueryVariants(question: string, count: number = 3): Promise<string[]> {
  const resp = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个查询改写助手。给定用户问题，生成 ${count} 个不同角度的搜索查询变体。
要求：
1. 每行一个查询，不要编号
2. 变体应从不同角度描述同一需求
3. 使用不同的关键词和表述
4. 只输出查询，不要其他内容`,
      },
      { role: 'user', content: question },
    ],
    temperature: 0.7,
  });

  const variants = resp.choices[0].message.content
    ?.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0) || [];

  return [question, ...variants];
}

// ========== RRF 融合: 合并多个检索结果 ==========

function reciprocalRankFusion(
  resultSets: SearchResult[][],
  k: number = 60,
): SearchResult[] {
  const scoreMap = new Map<string, { result: SearchResult; score: number }>();

  for (const results of resultSets) {
    results.forEach((r, rank) => {
      const key = `${r.metadata.source}:${r.metadata.chunkIndex}`;
      const rrfScore = 1 / (k + rank + 1);
      const existing = scoreMap.get(key);
      if (existing) {
        existing.score += rrfScore;
        if (r.similarity > existing.result.similarity) {
          existing.result = r;
        }
      } else {
        scoreMap.set(key, { result: r, score: rrfScore });
      }
    });
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(v => v.result);
}

// ========== 对比: 普通检索 vs Multi-query ==========

async function main() {
  const questions = [
    '怎么让 RAG 系统的回答更准确？',
    '本地运行大模型有哪些方案？',
    'AI 编码时怎么拆分任务？',
  ];

  for (const q of questions) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`问题: ${q}`);
    console.log('='.repeat(60));

    // --- 普通检索 ---
    console.log('\n📌 普通检索 (单次向量检索):');
    const normalResults = await vectorSearch(q, 3);
    normalResults.forEach((r, i) => {
      const src = r.metadata.source.replace(/^\.\.\/\.\.\/\.\.\//, '');
      console.log(`  #${i + 1} [${r.similarity.toFixed(4)}] ${src}`);
    });

    // --- Multi-query 检索 ---
    console.log('\n🔄 Multi-query 检索:');
    const variants = await generateQueryVariants(q, 3);
    console.log('  生成的查询变体:');
    variants.forEach((v, i) => console.log(`    ${i === 0 ? '原始' : `变体${i}`}: ${v}`));

    const allResults: SearchResult[][] = [];
    for (const variant of variants) {
      allResults.push(await vectorSearch(variant, 5));
    }

    const fused = reciprocalRankFusion(allResults);
    console.log('\n  RRF 融合后结果:');
    fused.slice(0, 5).forEach((r, i) => {
      const src = r.metadata.source.replace(/^\.\.\/\.\.\/\.\.\//, '');
      console.log(`  #${i + 1} [${r.similarity.toFixed(4)}] ${src}`);
    });

    // --- 覆盖率对比 ---
    const normalSources = new Set(normalResults.map(r => r.metadata.source));
    const fusedSources = new Set(fused.slice(0, 5).map(r => r.metadata.source));
    const newSources = [...fusedSources].filter(s => !normalSources.has(s));
    if (newSources.length > 0) {
      console.log(`\n  ✅ Multi-query 额外召回了 ${newSources.length} 个新来源`);
    } else {
      console.log('\n  ℹ️ 两种方式召回的来源相同');
    }
  }
}

main().catch(console.error);
