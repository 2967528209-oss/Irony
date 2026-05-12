# OpenAI API 基础

## 概览

OpenAI 提供 REST API，核心端点是 **Chat Completions**，用于与 GPT 系列模型对话。

### 认证

所有请求需要 API Key，通过 `Authorization` 头传递：

```
Authorization: Bearer sk-xxx
```

API Key 从 [platform.openai.com](https://platform.openai.com/api-keys) 获取。

---

## Chat Completions API

### 基础请求

```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: '你是一个有帮助的助手。' },
      { role: 'user', content: '什么是 RAG？' },
    ],
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### 使用 SDK

```bash
pnpm add openai
```

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const completion = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: '你是一个有帮助的助手。' },
    { role: 'user', content: '什么是 RAG？' },
  ],
});

console.log(completion.choices[0].message.content);
```

### Messages 结构

| 角色 | 说明 | 用途 |
|------|------|------|
| `system` | 系统指令 | 设定 AI 的行为、角色、约束 |
| `user` | 用户消息 | 用户的输入 |
| `assistant` | AI 回复 | 模型的历史回复（多轮对话用） |

多轮对话通过维护 messages 数组实现：

```typescript
const messages = [
  { role: 'system', content: '你是一个编程助手。' },
  { role: 'user', content: '用 TypeScript 写一个快排' },
  { role: 'assistant', content: '...(上一轮回复)...' },
  { role: 'user', content: '加上泛型支持' },
];
```

---

## 关键参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `model` | string | 模型名称（gpt-4o, gpt-4o-mini 等） |
| `messages` | array | 对话消息数组 |
| `temperature` | 0-2 | 随机性，0 最确定，1 默认 |
| `max_tokens` | number | 回复最大 token 数 |
| `stream` | boolean | 是否流式返回 |
| `response_format` | object | 指定输出格式（如 JSON Mode） |
| `tools` | array | Function Calling 工具定义 |

### temperature 选择

| 场景 | 推荐值 | 原因 |
|------|--------|------|
| 代码生成 | 0 - 0.2 | 需要确定性和准确性 |
| 对话助手 | 0.7 - 0.9 | 需要自然多样的回复 |
| 创意写作 | 1.0 - 1.5 | 需要发散性 |

---

## Streaming（流式响应）

### 基础流式调用

```typescript
const stream = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);
}
```

### 流式数据格式（SSE）

每个 chunk 通过 Server-Sent Events 推送：

```
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"Hello"}}]}
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":" world"}}]}
data: [DONE]
```

关键字段：
- `choices[0].delta.content` — 增量文本内容
- `choices[0].finish_reason` — 结束原因（`stop` / `length` / `tool_calls`）

---

## Function Calling（工具调用）

让模型决定何时调用外部工具：

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取指定城市的当前天气',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名称' },
        },
        required: ['city'],
      },
    },
  },
];

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: '北京今天天气怎么样？' }],
  tools,
});

const toolCall = response.choices[0].message.tool_calls?.[0];
if (toolCall) {
  const args = JSON.parse(toolCall.function.arguments);
  // args = { city: "北京" }
  // 执行实际函数，然后将结果返回给模型
}
```

### Function Calling 流程

```
用户提问 → 模型判断需要调用工具 → 返回 tool_calls
    → 执行工具函数 → 将结果作为 tool message 返回给模型
    → 模型基于工具结果生成最终回复
```

---

## JSON Mode（结构化输出）

强制模型返回有效 JSON：

```typescript
const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: '提取用户消息中的实体，返回 JSON 格式。',
    },
    { role: 'user', content: '明天下午3点和张三在星巴克开会' },
  ],
  response_format: { type: 'json_object' },
});

// 返回: { "time": "明天下午3点", "person": "张三", "location": "星巴克", "event": "开会" }
```

---

## 常用模型对比

| 模型 | 上下文窗口 | 特点 | 适用场景 |
|------|-----------|------|----------|
| gpt-4o | 128K | 最强多模态 | 复杂推理、图像理解 |
| gpt-4o-mini | 128K | 性价比高 | 日常任务、大量调用 |
| o1 / o3 | 200K | 深度推理 | 数学、代码、复杂逻辑 |

---

## 动手练习

1. 用 `openai` SDK 实现一个基础对话（发送消息 → 获取回复）
2. 改为流式输出，观察 chunk 结构
3. 定义一个 tool（如查询天气），实现 Function Calling 流程
4. 使用 JSON Mode 提取结构化信息

## 参考资源

- [OpenAI API 官方文档](https://platform.openai.com/docs/api-reference)
- [OpenAI Cookbook](https://cookbook.openai.com)
