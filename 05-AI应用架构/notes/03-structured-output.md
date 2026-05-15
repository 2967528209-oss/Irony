# 输出结构化

## 问题：LLM 输出不可控

LLM 默认返回自由文本。但程序要处理 LLM 的输出时，需要的是**可解析的结构**：

```
自由文本（不可控）：
  "北京今天28度，晴天，适合出行。"
  → 你的代码怎么从里面提取温度？正则？太脆弱了

结构化输出（可控）：
  { "city": "北京", "temp": 28, "weather": "晴", "suggestion": "适合出行" }
  → JSON.parse() 直接用
```

## 三种实现方式

### 方式 1：Prompt 引导（最基础）

在 Prompt 里要求 LLM 输出 JSON：

```typescript
const response = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [
    {
      role: 'system',
      content: `分析用户问题的意图，以 JSON 格式输出：
        { "intent": "问答|闲聊|任务", "topic": "主题", "confidence": 0-1 }
        只输出 JSON，不要其他内容。`,
    },
    { role: 'user', content: '帮我查一下明天北京的天气' },
  ],
});

const result = JSON.parse(response.choices[0].message.content!);
// { intent: "任务", topic: "天气查询", confidence: 0.95 }
```

问题：LLM 可能加上 ```json 包裹、多余解释文字，导致 `JSON.parse` 失败。

### 方式 2：JSON Mode（API 级别保证）

OpenAI / DeepSeek 支持 `response_format` 参数：

```typescript
const response = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [...],
  response_format: { type: 'json_object' },  // 强制输出合法 JSON
});

const data = JSON.parse(response.choices[0].message.content!);
```

API 保证返回的一定是合法 JSON，不会有多余文字。但**不保证 JSON 的结构**——可能缺字段、类型不对。

### 方式 3：Structured Output（Schema 约束）

OpenAI 的 Structured Output 可以指定 JSON Schema，保证输出严格符合定义：

```typescript
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'intent_analysis',
      schema: {
        type: 'object',
        properties: {
          intent: { type: 'string', enum: ['问答', '闲聊', '任务'] },
          topic: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['intent', 'topic', 'confidence'],
      },
    },
  },
});
```

这个保证字段名、类型、枚举值都严格符合 Schema。

> DeepSeek 目前支持 JSON Mode（方式 2），Structured Output（方式 3）支持有限。OpenAI GPT-4o 两者都完整支持。

## 三种方式对比

| 维度 | Prompt 引导 | JSON Mode | Structured Output |
|------|------------|-----------|-------------------|
| 可靠性 | 低（可能输出非 JSON） | 中（保证合法 JSON） | 高（保证符合 Schema） |
| 灵活性 | 高 | 高 | 受 Schema 约束 |
| 模型支持 | 所有模型 | 大部分模型 | 少数模型（GPT-4o） |
| 适用场景 | 原型/简单场景 | 生产环境 | 严格结构要求 |

## 防御性解析

不管用哪种方式，代码中都应该做**防御性解析**：

```typescript
function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    // 去除可能的 markdown 包裹
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}
```

## 实际应用场景

| 场景 | 结构化需求 | 推荐方式 |
|------|-----------|---------|
| 意图识别 | `{ intent, confidence }` | JSON Mode |
| 信息提取 | `{ name, phone, address }` | Structured Output |
| Agent 工具参数 | Function Calling 的 arguments | 自带结构化（已学） |
| 评估打分 | `{ score, reason }` | JSON Mode |
| 多选项生成 | `[{ title, description }]` | JSON Mode |

## 与 Zod 结合（TypeScript 验证）

Zod 是 TypeScript 的运行时类型验证库，配合 LLM 输出特别好用：

```typescript
import { z } from 'zod';

const IntentSchema = z.object({
  intent: z.enum(['问答', '闲聊', '任务']),
  topic: z.string(),
  confidence: z.number().min(0).max(1),
});

type Intent = z.infer<typeof IntentSchema>;

function parseIntent(llmOutput: string): Intent | null {
  try {
    const data = JSON.parse(llmOutput);
    return IntentSchema.parse(data);  // 类型 + 值域校验
  } catch {
    return null;
  }
}
```

Zod 做两件事：
1. **运行时校验**：确保 JSON 结构和值域正确
2. **类型推导**：`z.infer` 自动生成 TypeScript 类型，不用手写 interface

## 与前面知识的关系

Agent 阶段的 Function Calling 本质上就是结构化输出的一种——LLM 输出的 `tool_calls` 就是严格的 JSON 结构（函数名 + 参数）。

区别在于：
- Function Calling：结构化的是**工具调用指令**
- Structured Output：结构化的是**回答内容本身**
