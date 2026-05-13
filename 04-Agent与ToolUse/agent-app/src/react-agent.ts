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

// ========== Token 估算与记忆管理 ==========

function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

function getMessagesTokens(messages: ChatCompletionMessageParam[]): number {
  return messages.reduce((sum, m) => {
    let text = '';
    if (typeof m.content === 'string') text = m.content;
    else if (m.content === null) text = '';
    if ('tool_calls' in m && m.tool_calls) {
      text += m.tool_calls.map(tc =>
        `${tc.function.name}(${tc.function.arguments})`
      ).join('');
    }
    return sum + estimateTokens(text) + 4;
  }, 0);
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

async function summarizeHistory(
  messages: ChatCompletionMessageParam[],
  keepRecent: number = 4,
): Promise<ChatCompletionMessageParam[]> {
  const system = messages[0];
  if (messages.length <= keepRecent + 2) return messages;

  const old = messages.slice(1, -(keepRecent));
  const recent = messages.slice(-keepRecent);

  const oldText = old.map(m => {
    const role = m.role;
    const content = typeof m.content === 'string' ? m.content : '';
    return `[${role}]: ${content.slice(0, 200)}`;
  }).join('\n');

  console.log('\n🧠 记忆压缩中 — 发送摘要请求到 DeepSeek...');

  const resp = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: '用 3-5 句话总结以下对话的关键信息和结论，保留工具调用的结果。' },
      { role: 'user', content: oldText },
    ],
  });

  const summary = resp.choices[0].message.content || '';
  console.log(`📝 摘要: ${summary.slice(0, 100)}...`);

  const beforeTokens = getMessagesTokens(messages);
  const result: ChatCompletionMessageParam[] = [
    system,
    { role: 'system', content: `[对话历史摘要] ${summary}` },
    ...recent,
  ];
  const afterTokens = getMessagesTokens(result);
  console.log(`💾 压缩: ${formatTokens(beforeTokens)} → ${formatTokens(afterTokens)} tokens (节省 ${Math.round((1 - afterTokens / beforeTokens) * 100)}%)\n`);

  return result;
}

// ========== 对话统计 ==========

interface SessionStats {
  totalApiCalls: number;
  totalToolCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  compressions: number;
}

const stats: SessionStats = {
  totalApiCalls: 0,
  totalToolCalls: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  compressions: 0,
};

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

// ========== ReAct Agent 循环（带记忆管理） ==========

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

const TOKEN_THRESHOLD = 10000;

async function streamAgentStep(messages: ChatCompletionMessageParam[]) {
  const stream = await deepseekClient.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    tools,
    stream: true,
    stream_options: { include_usage: true },
  });

  let content = '';
  let toolCalls: { id: string; function: { name: string; arguments: string } }[] = [];
  let finishReason = '';
  let isFirstContent = true;
  let usage = { prompt_tokens: 0, completion_tokens: 0 };

  for await (const chunk of stream) {
    if (chunk.usage) {
      usage.prompt_tokens = chunk.usage.prompt_tokens;
      usage.completion_tokens = chunk.usage.completion_tokens;
    }

    const choice = chunk.choices[0];
    if (!choice) continue;

    const delta = choice.delta;
    finishReason = choice.finish_reason || finishReason;

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

  stats.totalApiCalls++;
  stats.totalInputTokens += usage.prompt_tokens;
  stats.totalOutputTokens += usage.completion_tokens;

  return { content, toolCalls: toolCalls.filter(Boolean), finishReason, usage };
}

let conversationMessages: ChatCompletionMessageParam[] = [
  { role: 'system', content: SYSTEM_PROMPT },
];

function compactAfterAnswer(messages: ChatCompletionMessageParam[]): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [];

  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];

    if (msg.role === 'user') {
      const userMsg = msg;
      let finalAnswer = '';
      let toolsUsed: string[] = [];
      let j = i + 1;

      while (j < messages.length && messages[j].role !== 'user') {
        const m = messages[j];
        if (m.role === 'assistant' && 'tool_calls' in m && m.tool_calls) {
          toolsUsed.push(...m.tool_calls.map(tc => tc.function.name));
        }
        if (m.role === 'assistant' && !('tool_calls' in m && m.tool_calls) && typeof m.content === 'string') {
          finalAnswer = m.content;
        }
        j++;
      }

      result.push(userMsg);

      if (j < messages.length) {
        const summary = finalAnswer.slice(0, 200);
        const tools = toolsUsed.length ? ` [使用了: ${toolsUsed.join(', ')}]` : '';
        result.push({ role: 'assistant', content: `${summary}${tools}` });
      } else {
        for (let k = i + 1; k < j; k++) {
          result.push(messages[k]);
        }
      }

      i = j;
    } else {
      result.push(msg);
      i++;
    }
  }

  return result;
}

async function agentLoop(question: string): Promise<void> {
  conversationMessages = compactAfterAnswer(conversationMessages);
  conversationMessages.push({ role: 'user', content: question });

  const workingMessages: ChatCompletionMessageParam[] = [...conversationMessages];
  const maxSteps = 8;

  for (let step = 1; step <= maxSteps; step++) {
    const currentTokens = getMessagesTokens(workingMessages);

    console.log(`\n${'─'.repeat(40)}`);
    console.log(`📡 Step ${step}/${maxSteps} — 发送请求到 DeepSeek`);
    console.log(`   消息数: ${workingMessages.length} | 上下文估算: ~${formatTokens(currentTokens)} tokens`);

    if (currentTokens > TOKEN_THRESHOLD) {
      console.log(`   ⚠️ 超过 ${formatTokens(TOKEN_THRESHOLD)} 阈值，触发记忆压缩`);
      const compressed = await summarizeHistory(workingMessages);
      workingMessages.length = 0;
      workingMessages.push(...compressed);
      stats.compressions++;
    }

    const { content, toolCalls, usage } = await streamAgentStep(workingMessages);

    console.log(`   📊 本次消耗: 输入 ${formatTokens(usage.prompt_tokens)} + 输出 ${formatTokens(usage.completion_tokens)} tokens`);

    if (toolCalls.length === 0) {
      if (content) {
        conversationMessages.push({ role: 'assistant', content });
      }
      console.log(`\n✅ Agent 完成（共 ${step} 步 | 累计 API 调用 ${stats.totalApiCalls} 次）`);
      return;
    }

    stats.totalToolCalls += toolCalls.length;

    workingMessages.push({
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

      workingMessages.push({
        role: 'tool' as const,
        tool_call_id: toolCall.id,
        content: result,
      });
    }
  }

  console.log('\n⚠️ 达到最大步数限制，停止执行。');
}

// ========== 交互指令处理 ==========

function handleCommand(cmd: string): boolean {
  switch (cmd) {
    case '/stats': {
      console.log('\n📊 会话统计:');
      console.log(`   API 调用: ${stats.totalApiCalls} 次`);
      console.log(`   工具调用: ${stats.totalToolCalls} 次`);
      console.log(`   输入 Token: ${formatTokens(stats.totalInputTokens)}`);
      console.log(`   输出 Token: ${formatTokens(stats.totalOutputTokens)}`);
      console.log(`   总 Token: ${formatTokens(stats.totalInputTokens + stats.totalOutputTokens)}`);
      console.log(`   记忆压缩: ${stats.compressions} 次`);
      return true;
    }
    case '/history': {
      console.log(`\n📜 当前消息列表 (${conversationMessages.length} 条, ~${formatTokens(getMessagesTokens(conversationMessages))} tokens):`);
      conversationMessages.forEach((m, i) => {
        const role = m.role.padEnd(10);
        let preview = '';
        if (typeof m.content === 'string') preview = m.content.slice(0, 60);
        if ('tool_calls' in m && m.tool_calls) {
          preview = m.tool_calls.map(tc => `${tc.function.name}(...)`).join(', ');
        }
        console.log(`   [${i}] ${role} ${preview}${preview.length >= 60 ? '...' : ''}`);
      });
      return true;
    }
    case '/clear': {
      const oldLen = conversationMessages.length;
      conversationMessages = [{ role: 'system', content: SYSTEM_PROMPT }];
      stats.totalApiCalls = 0;
      stats.totalToolCalls = 0;
      stats.totalInputTokens = 0;
      stats.totalOutputTokens = 0;
      stats.compressions = 0;
      console.log(`\n🗑️ 已清除 ${oldLen - 1} 条消息，统计已重置。`);
      return true;
    }
    case '/help': {
      console.log('\n📋 可用指令:');
      console.log('   /stats   — 查看会话统计（API 调用、Token 消耗）');
      console.log('   /history — 查看当前消息列表');
      console.log('   /clear   — 清除对话历史');
      console.log('   /help    — 显示帮助');
      console.log('   q/exit   — 退出');
      return true;
    }
    default:
      return false;
  }
}

// ========== 交互式入口 ==========

async function main() {
  console.log('=== ReAct Agent 交互模式（带记忆管理） ===');
  console.log('工具: 知识库检索 | 数学计算 | 当前时间');
  console.log('指令: /stats /history /clear /help');
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

      if (q.startsWith('/')) {
        if (!handleCommand(q)) {
          console.log(`未知指令: ${q}，输入 /help 查看可用指令`);
        }
        console.log();
        ask();
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
