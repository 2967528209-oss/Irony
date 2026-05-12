# Token 计算与上下文窗口管理

## Token 是什么

Token 是 LLM 处理文本的最小单位。它不等于字符，也不等于单词：

```
英文：  "Hello world" → ["Hello", " world"]             → 2 tokens
中文：  "你好世界"    → ["你好", "世界"]                   → 2 tokens (大致)
代码：  "console.log" → ["console", ".", "log"]          → 3 tokens
```

**经验估算**：
- 英文：1 token ≈ 4 个字符 ≈ 0.75 个单词
- 中文：1 token ≈ 1-2 个汉字

## 上下文窗口

上下文窗口 = Prompt tokens + Completion tokens 的总容量。

| 模型 | 上下文窗口 | 最大输出 |
|------|-----------|----------|
| DeepSeek V4 Pro | 1M tokens | 384K tokens |
| DeepSeek V3 | 128K tokens | 8K tokens |
| GPT-4o | 128K tokens | 16K tokens |
| Claude Sonnet 4 | 200K tokens | 64K tokens |

超出窗口限制时，API 会报错或截断。

## 成本计算

LLM API 按 token 计费，输入和输出价格通常不同：

```
总成本 = Prompt tokens × 输入单价 + Completion tokens × 输出单价
```

以 DeepSeek V3 为例：
```
输入：¥1 / 百万 tokens（缓存命中 ¥0.1）
输出：¥2 / 百万 tokens

一次对话（26 prompt + 53 completion）：
成本 ≈ 0.000026 + 0.000106 ≈ ¥0.000132（约 0.013 分钱）
```

## 代码中获取 Token 用量

### 非流式

```typescript
const completion = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [...],
});

const { prompt_tokens, completion_tokens, total_tokens } = completion.usage!;
```

### 流式

流式响应中，`usage` 信息在最后一个 chunk 中返回（部分模型需要额外参数开启）：

```typescript
const stream = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages: [...],
  stream: true,
  stream_options: { include_usage: true },
});

for await (const chunk of stream) {
  if (chunk.usage) {
    console.log('Token usage:', chunk.usage);
  }
}
```

## 上下文管理策略

当对话历史累积过长时，必须主动管理上下文：

### 策略 1：固定窗口截断

保留最近 N 条消息，丢弃更早的：

```typescript
function trimMessages(messages: Message[], maxMessages: number = 20): Message[] {
  if (messages.length <= maxMessages) return messages;

  const systemMsg = messages.find(m => m.role === 'system');
  const recentMsgs = messages.slice(-maxMessages);

  return systemMsg ? [systemMsg, ...recentMsgs] : recentMsgs;
}
```

### 策略 2：Token 预算截断

按 token 数量控制，更精确：

```typescript
function trimByTokenBudget(
  messages: Message[],
  maxTokens: number,
  estimateTokens: (text: string) => number,
): Message[] {
  const systemMsg = messages.find(m => m.role === 'system');
  const nonSystemMsgs = messages.filter(m => m.role !== 'system');

  let tokenCount = systemMsg ? estimateTokens(systemMsg.content) : 0;
  const result: Message[] = [];

  // 从最新消息向前遍历，直到 token 预算用完
  for (let i = nonSystemMsgs.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(nonSystemMsgs[i].content);
    if (tokenCount + msgTokens > maxTokens) break;
    tokenCount += msgTokens;
    result.unshift(nonSystemMsgs[i]);
  }

  return systemMsg ? [systemMsg, ...result] : result;
}
```

### 策略 3：摘要压缩

让 LLM 将早期对话摘要后替换原文：

```typescript
async function summarizeHistory(messages: Message[]): Promise<Message> {
  const summary = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: '将以下对话历史压缩为一段简洁的摘要，保留关键信息和决策。',
      },
      {
        role: 'user',
        content: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
      },
    ],
  });

  return {
    role: 'system',
    content: `[对话历史摘要] ${summary.choices[0].message.content}`,
  };
}
```

## 动手练习

1. 修改 `01-basic-chat.ts`，打印每个 token 的单价，计算本次调用成本
2. 实现一个多轮对话，观察 token 数随对话轮次的增长
3. 实现固定窗口截断，对比截断前后的 token 消耗

## 参考资源

- [OpenAI Tokenizer 在线工具](https://platform.openai.com/tokenizer)
- [DeepSeek 定价](https://api-docs.deepseek.com/quick_start/pricing)
