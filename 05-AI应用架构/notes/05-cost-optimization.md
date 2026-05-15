# 成本优化

## AI 应用的成本结构

传统应用的成本主要是服务器。AI 应用多了一项大头：**模型调用费**。

```
传统应用：服务器 + 数据库 + 带宽
AI 应用： 服务器 + 数据库 + 带宽 + 模型调用（通常占 60-80%）
```

模型调用费按 Token 计费。以 DeepSeek 为例：

| 模型 | 输入 (每百万 Token) | 输出 (每百万 Token) |
|------|-------------------|-------------------|
| deepseek-chat | ¥1 (缓存命中 ¥0.1) | ¥2 |
| GPT-4o | ~¥17.5 | ~¥70 |
| Claude Opus | ~¥75 | ~¥375 |

DeepSeek 便宜是因为国内竞争激烈 + 架构优化。但量上来后一样可观。

## 五个优化方向

### 1. 模型路由（最直接有效）

不是所有请求都需要用最贵的模型：

```
"你好" → 小模型（deepseek-chat 或更便宜的）
"帮我分析这份财报数据" → 大模型（deepseek-chat 或 GPT-4o）
```

```typescript
function selectModel(query: string): string {
  const complexitySignals = [
    query.length > 500,                    // 长输入
    /分析|对比|总结|设计|架构/.test(query), // 复杂任务词
    query.includes('代码'),                // 代码相关
  ];
  
  const complexity = complexitySignals.filter(Boolean).length;
  
  if (complexity >= 2) return 'deepseek-chat';     // 复杂任务
  return 'deepseek-chat';                           // DeepSeek 已经很便宜
  // 如果用 OpenAI: complexity >= 2 → gpt-4o，否则 → gpt-4o-mini
}
```

模型路由对用 OpenAI/Claude 的团队**效果最明显**（10 倍以上价差）。DeepSeek 本身已经够便宜，路由价值没那么大。

### 2. 缓存策略

**完全相同的问题不要重复调 LLM**。

```
层级 1：精确匹配缓存
  "今天星期几" 问过一次 → 直接返回缓存

层级 2：语义相似缓存
  "今天周几" ≈ "今天星期几" → 返回之前的结果

层级 3：API 级缓存（DeepSeek Prompt Cache）
  相同 Prompt 前缀 → API 自动命中缓存，输入价格降 90%
```

```typescript
const cache = new Map<string, { reply: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

async function cachedChat(query: string): Promise<string> {
  const key = query.trim().toLowerCase();
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Cache Hit]');
    return cached.reply;
  }
  
  const reply = await callLLM(query);
  cache.set(key, { reply, timestamp: Date.now() });
  return reply;
}
```

还记得之前讨论过的 DeepSeek Prompt Cache 吗？那是 API 级别的缓存——相同的 System Prompt 前缀会自动命中，不需要你额外实现。

### 3. Prompt 压缩

Token 越多越贵。减少输入 Token 的方式：

| 方法 | 效果 |
|------|------|
| 精简 System Prompt | 去掉冗余说明，保留关键指令 |
| 压缩对话历史 | 用摘要替代完整历史（我们在 Agent 中已实现） |
| RAG 结果截断 | 只传最相关的前 N 个结果 |
| 去除无关上下文 | 不要把整个文件传给 LLM，只传相关片段 |

我们 Agent 中的 `compactAfterAnswer()` 就是 Prompt 压缩的实践。

### 4. 批处理

对于非实时场景，攒一批请求一起发，利用 Batch API 折扣：

```
实时请求：用户发一条处理一条 → 全价
批处理：攒 100 条一起发 → 通常 50% 折扣（OpenAI Batch API）
```

适用场景：内容审核、数据标注、批量翻译等不需要即时响应的任务。

### 5. Token 预算管理

给每个用户/场景设定 Token 上限：

```typescript
const userBudgets = new Map<string, number>();
const DAILY_BUDGET = 100000; // 每用户每天 10 万 token

async function budgetedChat(userId: string, query: string): Promise<string> {
  const used = userBudgets.get(userId) || 0;
  
  if (used > DAILY_BUDGET) {
    return '今日使用额度已用完，请明天再来~';
  }
  
  const response = await callLLM(query);
  const tokensUsed = response.usage.total_tokens;
  userBudgets.set(userId, used + tokensUsed);
  
  return response.choices[0].message.content;
}
```

## 与 QQ Bot 的关联

你的 QQ Bot 当前没有任何成本控制。如果在群里公开使用：

| 风险 | 对策 |
|------|------|
| 有人疯狂提问消耗额度 | Token 预算限制 |
| 反复问同一个问题 | 精确匹配缓存 |
| 发超长消息浪费 Token | 输入长度限制 |

DeepSeek 虽然便宜，但群里如果有几十人用，一天消耗也不小。

## 成本监控

优化的前提是能看到成本。最简单的方式：

```typescript
// 每次调用记录 token 消耗
const dailyStats = {
  date: new Date().toISOString().slice(0, 10),
  totalCalls: 0,
  inputTokens: 0,
  outputTokens: 0,
  get estimatedCost() {
    return (this.inputTokens * 1 + this.outputTokens * 2) / 1_000_000; // DeepSeek 价格（元）
  },
};
```

先能看到数字，再决定在哪里优化。
