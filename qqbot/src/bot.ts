import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

// ========== 配置 ==========

const config = {
  napcat: {
    wsUrl: process.env.NAPCAT_WS_URL || 'ws://127.0.0.1:3001',
    token: process.env.NAPCAT_TOKEN || '',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseUrl: process.env.DEEPSEEK_BASE_URL!,
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  bot: {
    triggerPrefix: process.env.BOT_TRIGGER || '/ai',
    maxHistoryPerUser: 20,
    systemPrompt: process.env.BOT_SYSTEM_PROMPT ||
      '你是一个 QQ 群里的 AI 助手，回答简洁友好。不要使用 Markdown 格式，因为 QQ 不支持渲染。',
  },
};

const deepseekClient = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseUrl,
});

// ========== 对话记忆（按用户隔离） ==========

const userHistories = new Map<string, ChatCompletionMessageParam[]>();

function getHistory(userId: string): ChatCompletionMessageParam[] {
  if (!userHistories.has(userId)) {
    userHistories.set(userId, []);
  }
  return userHistories.get(userId)!;
}

function addToHistory(userId: string, role: 'user' | 'assistant', content: string) {
  const history = getHistory(userId);
  history.push({ role, content });
  if (history.length > config.bot.maxHistoryPerUser) {
    history.splice(0, 2);
  }
}

function clearHistory(userId: string) {
  userHistories.set(userId, []);
}

// ========== DeepSeek 调用 ==========

async function chat(userId: string, message: string): Promise<string> {
  addToHistory(userId, 'user', message);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: config.bot.systemPrompt },
    ...getHistory(userId),
  ];

  try {
    const response = await deepseekClient.chat.completions.create({
      model: config.deepseek.model,
      messages,
      max_tokens: 1000,
    });

    const reply = response.choices[0]?.message?.content || '(无回复)';
    addToHistory(userId, 'assistant', reply);
    return reply;
  } catch (err: any) {
    console.error('[DeepSeek Error]', err.message);
    return `调用失败: ${err.message}`;
  }
}

// ========== OneBot v11 协议 ==========

interface OneBotEvent {
  post_type: string;
  message_type?: string;
  group_id?: number;
  user_id?: number;
  sender?: { nickname?: string; card?: string };
  raw_message?: string;
  message_id?: number;
  message?: any[];
  self_id?: number;
}

function extractText(event: OneBotEvent): string {
  if (event.raw_message) {
    return event.raw_message
      .replace(/\[CQ:[^\]]+\]/g, '')
      .trim();
  }
  if (Array.isArray(event.message)) {
    return event.message
      .filter((seg: any) => seg.type === 'text')
      .map((seg: any) => seg.data?.text || '')
      .join('')
      .trim();
  }
  return '';
}

// ========== WebSocket 连接 NapCat ==========

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function sendAction(action: string, params: Record<string, any>) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[WS] 未连接，无法发送');
    return;
  }
  const payload = JSON.stringify({ action, params });
  ws.send(payload);
}

function sendGroupMessage(groupId: number, text: string) {
  sendAction('send_group_msg', {
    group_id: groupId,
    message: [{ type: 'text', data: { text } }],
  });
}

function sendPrivateMessage(userId: number, text: string) {
  sendAction('send_private_msg', {
    user_id: userId,
    message: [{ type: 'text', data: { text } }],
  });
}

async function handleMessage(event: OneBotEvent) {
  const text = extractText(event);
  if (!text) return;

  const userId = String(event.user_id || '');
  const isGroup = event.message_type === 'group';
  const groupId = event.group_id;
  const senderName = event.sender?.card || event.sender?.nickname || userId;

  // /clear 清除记忆
  if (text === `${config.bot.triggerPrefix} clear` || text === '/clear') {
    clearHistory(userId);
    if (isGroup && groupId) {
      sendGroupMessage(groupId, '对话已清除~');
    } else {
      sendPrivateMessage(Number(userId), '对话已清除~');
    }
    return;
  }

  let query = '';

  if (isGroup) {
    // 群消息：需要触发前缀
    if (!text.startsWith(config.bot.triggerPrefix)) return;
    query = text.slice(config.bot.triggerPrefix.length).trim();
    if (!query) {
      sendGroupMessage(groupId!, `用法: ${config.bot.triggerPrefix} 你的问题`);
      return;
    }
  } else {
    // 私聊：直接回复
    query = text;
  }

  console.log(`[${isGroup ? `群${groupId}` : '私聊'}] ${senderName}: ${query}`);

  const reply = await chat(userId, query);

  console.log(`[回复] ${reply.slice(0, 80)}${reply.length > 80 ? '...' : ''}`);

  if (isGroup && groupId) {
    sendGroupMessage(groupId, reply);
  } else {
    sendPrivateMessage(Number(userId), reply);
  }
}

function connect() {
  const url = config.napcat.token
    ? `${config.napcat.wsUrl}?access_token=${config.napcat.token}`
    : config.napcat.wsUrl;

  console.log(`[WS] 连接 NapCat: ${config.napcat.wsUrl}`);
  ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('[WS] 已连接 NapCat ✅');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  ws.on('message', async (data) => {
    try {
      const event: OneBotEvent = JSON.parse(data.toString());

      if (event.post_type === 'meta_event') return;

      if (event.post_type === 'message') {
        await handleMessage(event);
      }
    } catch (err: any) {
      console.error('[Parse Error]', err.message);
    }
  });

  ws.on('close', () => {
    console.log('[WS] 连接断开，5 秒后重连...');
    reconnectTimer = setTimeout(connect, 5000);
  });

  ws.on('error', (err) => {
    console.error('[WS Error]', err.message);
  });
}

// ========== 启动 ==========

console.log('=== QQ Bot (DeepSeek) ===');
console.log(`触发词: "${config.bot.triggerPrefix} <问题>"`);
console.log(`私聊: 直接发消息`);
console.log(`清除记忆: /clear`);
console.log(`每用户最大历史: ${config.bot.maxHistoryPerUser} 条`);
console.log();

if (!config.deepseek.apiKey) {
  console.error('❌ 缺少 DEEPSEEK_API_KEY，请在 .env.local 中配置');
  process.exit(1);
}

connect();
