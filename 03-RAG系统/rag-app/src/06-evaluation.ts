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

async function retrieve(query: string, topK: number = 3) {
  const entries = await getEntries();
  const resp = await ollamaClient.embeddings.create({ model: 'bge-m3', input: query });
  const qVec = resp.data[0].embedding;

  return entries
    .map(e => ({ content: e.content, metadata: e.metadata, similarity: cosineSimilarity(qVec, e.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// ========== 评估数据集 ==========

interface EvalCase {
  question: string;
  expectedSourceKeyword: string;  // 期望命中的文档路径关键词
  expectedContentKeyword: string; // 期望回答中包含的关键词
}

const evalDataset: EvalCase[] = [
  {
    question: '什么是 RAG？',
    expectedSourceKeyword: 'rag-architecture',
    expectedContentKeyword: '检索增强生成',
  },
  {
    question: 'Embedding 模型有哪些选择？',
    expectedSourceKeyword: 'embedding',
    expectedContentKeyword: 'BGE',
  },
  {
    question: '如何处理 LLM 的 Rate Limit？',
    expectedSourceKeyword: 'error-handling',
    expectedContentKeyword: '重试',
  },
  {
    question: 'Cursor Skills 和 Rules 有什么区别？',
    expectedSourceKeyword: 'skills-system',
    expectedContentKeyword: 'Skills',
  },
  {
    question: '向量数据库应该选哪个？',
    expectedSourceKeyword: 'vector-database',
    expectedContentKeyword: 'pgvector',
  },
  {
    question: '文本分块有哪些策略？',
    expectedSourceKeyword: 'chunking',
    expectedContentKeyword: '递归',
  },
  {
    question: 'Vercel AI SDK 有什么用？',
    expectedSourceKeyword: 'vercel-ai-sdk',
    expectedContentKeyword: 'streamText',
  },
  {
    question: '什么是 Reranker？',
    expectedSourceKeyword: 'reranking',
    expectedContentKeyword: 'Cross-encoder',
  },
];

// ========== 评估指标 ==========

// Recall@K: Top-K 结果中是否命中了期望的来源文档
function evalRecall(results: { metadata: { source: string } }[], expectedKeyword: string): boolean {
  return results.some(r => r.metadata.source.includes(expectedKeyword));
}

// Faithfulness: LLM 的回答是否基于检索到的文档（用 LLM 判断）
async function evalFaithfulness(
  question: string,
  answer: string,
  contexts: string[],
): Promise<{ score: number; reasoning: string }> {
  const resp = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `你是一个评估助手。判断"回答"是否忠实于"参考资料"，不编造资料中没有的信息。
输出格式（严格JSON）：
{"score": 0.0到1.0的数字, "reasoning": "一句话理由"}`,
      },
      {
        role: 'user',
        content: `问题：${question}\n\n参考资料：\n${contexts.join('\n---\n')}\n\n回答：${answer}`,
      },
    ],
    temperature: 0,
  });

  try {
    const text = resp.choices[0].message.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 0, reasoning: '无法解析' };
  } catch {
    return { score: 0, reasoning: '解析失败' };
  }
}

// ========== 主评估流程 ==========

async function main() {
  console.log('=== RAG 评估管线 ===\n');
  console.log(`评估数据集: ${evalDataset.length} 条\n`);

  let recallHits = 0;
  let faithfulnessTotal = 0;
  const results: { question: string; recall: boolean; faithfulness: number }[] = [];

  for (let i = 0; i < evalDataset.length; i++) {
    const tc = evalDataset[i];
    console.log(`[${i + 1}/${evalDataset.length}] ${tc.question}`);

    // 1. 检索
    const docs = await retrieve(tc.question, 3);

    // 2. 检索评估 (Recall@3)
    const recall = evalRecall(docs, tc.expectedSourceKeyword);
    if (recall) recallHits++;

    // 3. 生成回答
    const context = docs.map((d, j) => `[来源${j + 1}]\n${d.content}`).join('\n---\n');
    const genResp = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '基于参考资料简洁回答问题，每个事实用[来源N]标注。控制在100字内。',
        },
        { role: 'user', content: `参考资料：\n${context}\n\n问题：${tc.question}` },
      ],
      temperature: 0.3,
    });
    const answer = genResp.choices[0].message.content || '';

    // 4. 忠实度评估
    const faith = await evalFaithfulness(tc.question, answer, docs.map(d => d.content));
    faithfulnessTotal += faith.score;

    results.push({ question: tc.question, recall, faithfulness: faith.score });

    const recallIcon = recall ? '✅' : '❌';
    console.log(`  Recall@3: ${recallIcon}  Faithfulness: ${faith.score.toFixed(2)}  ${faith.reasoning}`);
    console.log(`  回答: ${answer.slice(0, 80)}...\n`);
  }

  // ========== 汇总报告 ==========
  console.log('='.repeat(60));
  console.log('📊 评估报告');
  console.log('='.repeat(60));
  console.log(`  Recall@3:      ${recallHits}/${evalDataset.length} = ${(recallHits / evalDataset.length * 100).toFixed(1)}%`);
  console.log(`  Faithfulness:  ${(faithfulnessTotal / evalDataset.length).toFixed(2)} / 1.00`);
  console.log();

  console.log('  详细结果:');
  results.forEach((r, i) => {
    const recall = r.recall ? '✅' : '❌';
    console.log(`    ${i + 1}. ${recall} Recall | ${r.faithfulness.toFixed(2)} Faith | ${r.question}`);
  });
}

main().catch(console.error);
