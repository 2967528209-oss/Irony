/**
 * 练习 3：Function Calling（工具调用）
 * 定义一个天气查询工具，让模型决定何时调用。
 *
 * 运行：pnpm demo:tools
 */
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import type { ChatCompletionTool, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env.local') });

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

// 模拟的天气查询函数
function getWeather(city: string): string {
  const weatherData: Record<string, string> = {
    '北京': '晴，28°C，湿度 45%',
    '上海': '多云，25°C，湿度 72%',
    '深圳': '阵雨，30°C，湿度 85%',
  };
  return weatherData[city] || `未找到 ${city} 的天气数据`;
}

// 工具定义
const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取指定城市的当前天气信息',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名称，如 北京、上海' },
        },
        required: ['city'],
      },
    },
  },
];

async function functionCallingDemo() {
  console.log('--- Function Calling ---\n');

  const messages: ChatCompletionMessageParam[] = [
    { role: 'user', content: '北京和上海今天天气怎么样？' },
  ];

  // 第一轮：模型决定调用哪些工具
  console.log(`用户: ${messages[0].content}\n`);

  const firstResponse = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    tools,
  });

  const assistantMessage = firstResponse.choices[0].message;
  const toolCalls = assistantMessage.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    console.log('模型没有调用工具，直接回复：');
    console.log(assistantMessage.content);
    return;
  }

  // 将 assistant 消息（含 tool_calls）加入上下文
  messages.push(assistantMessage);

  // 执行每个工具调用
  console.log(`模型请求调用 ${toolCalls.length} 个工具：\n`);

  for (const toolCall of toolCalls) {
    const args = JSON.parse(toolCall.function.arguments);
    console.log(`  → 调用 ${toolCall.function.name}(${JSON.stringify(args)})`);

    const result = getWeather(args.city);
    console.log(`  ← 结果: ${result}\n`);

    // 将工具结果返回给模型
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: result,
    });
  }

  // 第二轮：模型基于工具结果生成最终回复
  const finalResponse = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages,
  });

  console.log(`AI 最终回复: ${finalResponse.choices[0].message.content}`);
}

functionCallingDemo().catch(console.error);
