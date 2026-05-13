import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { createInterface } from 'readline';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

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

// ========== 工具定义 ==========

const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: '在学习笔记知识库中搜索相关内容。当用户提出关于 RAG、LLM、AI 编码、Embedding 等技术问题时使用。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索查询，自然语言描述要查找的内容',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: '执行数学计算。当需要做算术运算、单位换算或数学分析时使用。',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '数学表达式，如 "2 + 3 * 4"、"Math.sqrt(144)"、"1024 * 1024 / 1000000"',
          },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: '获取当前日期和时间。当用户询问现在几点、今天日期时使用。',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// ========== 工具实现 ==========

interface VectorEntry {
  content: string;
  metadata: { source: string; title: string; chunkIndex: number };
  embedding: number[];
}

let cachedEntries: VectorEntry[] | null = null;

async function loadVectorStore(): Promise<VectorEntry[]> {
  if (cachedEntries) return cachedEntries;
  const storePath = resolve(__dirname, '../../../03-RAG系统/rag-app/data/vector-store.json');
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

async function searchKnowledge(query: string): Promise<string> {
  const entries = await loadVectorStore();
  const resp = await ollamaClient.embeddings.create({ model: 'bge-m3', input: query });
  const qVec = resp.data[0].embedding;

  const results = entries
    .map(e => ({ ...e, similarity: cosineSimilarity(qVec, e.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  return results
    .map((r, i) => {
      const src = r.metadata.source.replace(/^\.\.\/\.\.\/\.\.\//, '');
      return `[结果${i + 1}] (${src}, 相似度: ${r.similarity.toFixed(3)})\n${r.content.slice(0, 300)}`;
    })
    .join('\n\n');
}

function calculate(expression: string): string {
  try {
    const sanitized = expression.replace(/[^0-9+\-*/.()%\s,a-zA-Z]/g, '');
    const result = new Function('Math', `return ${sanitized}`)(Math);
    return `${expression} = ${result}`;
  } catch (err: any) {
    return `计算错误: ${err.message}`;
  }
}

function getCurrentTime(): string {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {
    case 'search_knowledge':
      return searchKnowledge(args.query);
    case 'calculate':
      return calculate(args.expression);
    case 'get_current_time':
      return getCurrentTime();
    default:
      return `未知工具: ${name}`;
  }
}

// ========== ReAct Agent 循环 ==========

const SYSTEM_PROMPT = `你是一个拥有工具的 AI 助手。你可以使用以下工具来帮助回答问题：
- search_knowledge: 搜索学习笔记知识库
- calculate: 执行数学计算
- get_current_time: 获取当前时间

工作原则：
1. 对于技术问题，优先使用 search_knowledge 搜索知识库，基于搜索结果回答
2. 涉及数字计算时，使用 calculate 工具而非心算
3. 复杂问题分步处理：先搜索相关知识，再基于搜索结果判断是否需要进一步搜索或计算
4. 每一步先说出你的思考过程，再调用工具
5. 只有当问题完全不涉及知识库内容且不需要计算时，才直接回答`;

async function streamAgentStep(messages: ChatCompletionMessageParam[]) {
  const stream = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    tools,
    stream: true,
  });

  let content = '';
  let toolCalls: { id: string; function: { name: string; arguments: string } }[] = [];
  let finishReason = '';
  let isFirstContent = true;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    finishReason = chunk.choices[0]?.finish_reason || finishReason;

    if (delta?.content) {
      if (isFirstContent) {
        process.stdout.write('\n💬 ');
        isFirstContent = false;
      }
      process.stdout.write(delta.content);
      content += delta.content;
    }

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        if (!toolCalls[idx]) {
          toolCalls[idx] = { id: tc.id || '', function: { name: '', arguments: '' } };
        }
        if (tc.id) toolCalls[idx].id = tc.id;
        if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
        if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
      }
    }
  }

  if (content) process.stdout.write('\n');

  return { content, toolCalls: toolCalls.filter(Boolean), finishReason };
}

async function agentLoop(question: string): Promise<void> {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];

  const maxSteps = 8;

  for (let step = 1; step <= maxSteps; step++) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📡 Step ${step}/${maxSteps} — 发送请求到 DeepSeek...`);

    const { content, toolCalls, finishReason } = await streamAgentStep(messages);

    if (toolCalls.length === 0) {
      console.log(`\n✅ Agent 完成（共 ${step} 步）`);
      return;
    }

    messages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: tc.function,
      })),
    });

    for (const toolCall of toolCalls) {
      const fnName = toolCall.function.name;
      const fnArgs = JSON.parse(toolCall.function.arguments);

      console.log(`\n🔧 Action: ${fnName}(${JSON.stringify(fnArgs)})`);

      const isKnowledge = fnName === 'search_knowledge';
      if (isKnowledge) console.log('   ↳ 请求 Ollama Embedding...');

      const result = await executeTool(fnName, fnArgs);
      console.log(`📋 Observation: ${result.slice(0, 200)}${result.length > 200 ? '...' : ''}`);

      messages.push({
        role: 'tool' as const,
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  console.log('\n⚠️ 达到最大步数限制，停止执行。');
}

// ========== 交互式入口 ==========

async function main() {
  console.log('=== ReAct Agent 交互模式 ===');
  console.log('工具: 知识库检索 | 数学计算 | 当前时间');
  console.log('输入 q 退出\n');

  await loadVectorStore();
  console.log('知识库已加载。\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  rl.on('close', () => {
    console.log('\n再见！');
    process.exit(0);
  });

  const ask = () => {
    rl.question('❓ ', async (input) => {
      const q = input.trim();
      if (!q || q === 'q' || q === 'exit') {
        rl.close();
        return;
      }
      try {
        await agentLoop(q);
      } catch (err: any) {
        console.error(`❌ 错误: ${err.message}`);
      }
      console.log();
      ask();
    });
  };

  ask();
}

main().catch(console.error);
