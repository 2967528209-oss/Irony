# Anthropic API（Claude）

## 与 OpenAI API 的核心差异

Anthropic 的 Messages API 与 OpenAI Chat Completions 的设计理念相似，但有几个关键差异。

### 1. System Prompt 是顶层参数

```typescript
// OpenAI：system 放在 messages 数组里
const openaiRequest = {
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: '你是助手' },  // 在 messages 里
    { role: 'user', content: 'hello' },
  ],
};

// Anthropic：system 是独立的顶层参数
const anthropicRequest = {
  model: 'claude-sonnet-4-20250514',
  system: '你是助手',                        // 独立参数
  messages: [
    { role: 'user', content: 'hello' },
  ],
  max_tokens: 1024,                           // 必填
};
```

### 2. `max_tokens` 是必填项

OpenAI 默认有一个 max_tokens 值，Anthropic **必须显式指定**，否则报错。

### 3. 认证方式不同

```
OpenAI:    Authorization: Bearer sk-xxx
Anthropic: x-api-key: sk-ant-xxx
           anthropic-version: 2023-06-01
```

### 4. 流式事件格式不同

OpenAI 用简单的 `data: {...}` SSE 格式。Anthropic 使用更结构化的事件类型：

```
event: message_start
data: {"type":"message_start","message":{...}}

event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}

event: message_stop
data: {"type":"message_stop"}
```

### 5. Tool Use 结构差异

```typescript
// OpenAI: tools + tool_calls
const openaiTools = [{
  type: 'function',
  function: {
    name: 'get_weather',
    parameters: { ... },
  },
}];

// Anthropic: tools + tool_use content block
const anthropicTools = [{
  name: 'get_weather',
  description: '获取天气',
  input_schema: { ... },        // 注意是 input_schema 而非 parameters
}];
```

## SDK 使用

```bash
pnpm add @anthropic-ai/sdk
```

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  system: '你是一个技术助手',
  messages: [
    { role: 'user', content: '什么是 RAG？' },
  ],
});

console.log(message.content[0].text);
```

## 兼容性总结

| 维度 | OpenAI | Anthropic | DeepSeek |
|------|--------|-----------|----------|
| SDK | `openai` | `@anthropic-ai/sdk` | `openai`（兼容） |
| System Prompt | messages 中 | 顶层参数 | messages 中 |
| max_tokens | 可选 | 必填 | 可选 |
| 认证 | Bearer token | x-api-key | Bearer token |
| 流式格式 | 简单 SSE | 事件类型 SSE | 简单 SSE |
| Tool 定义 | `parameters` | `input_schema` | `parameters` |

**关键认知**：DeepSeek 和大多数国产模型都兼容 OpenAI 格式，这意味着只要掌握 OpenAI 的调用方式，就能覆盖大部分场景。Anthropic 是少数需要单独适配的 API。

## 参考资源

- [Anthropic API 文档](https://docs.anthropic.com/en/api)
- [Claude 模型列表](https://docs.anthropic.com/en/docs/about-claude/models)
