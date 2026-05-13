# 对话记忆与状态管理

## Agent 的记忆问题

LLM 没有真正的"记忆"——它只能看到你传给它的 `messages` 数组。Agent 循环每多一步，messages 就更长。

```
Step 1: messages = [system, user]                        → 200 tokens
Step 2: messages = [system, user, assistant, tool]       → 800 tokens
Step 3: messages = [system, user, assistant, tool, ...]  → 2000 tokens
...
Step N: messages 超出 context window                     → 崩溃
```

这就是 Agent 的**记忆管理**问题：如何在有限的 context window 中维持足够的上下文。

## 三种记忆类型

```
短期记忆（Working Memory）
  = 当前对话的 messages 数组
  = 几分钟前的交互
  = 自动存在，但会撑爆 context window

长期记忆（Long-term Memory）
  = 持久化存储的历史摘要
  = 跨对话保留的知识
  = 需要主动实现

工具记忆（Tool State）
  = 工具执行的中间结果
  = 文件系统、数据库中的状态
  = 不在 messages 中，需要重新获取
```

## 短期记忆管理策略

### 策略 1：滑动窗口

只保留最近 N 轮对话，丢弃早期消息：

```typescript
function trimMessages(messages: Message[], maxMessages: number): Message[] {
  const system = messages[0]; // 保留 system prompt
  const recent = messages.slice(-maxMessages);
  return [system, ...recent];
}
```

问题：早期的重要信息会丢失。

### 策略 2：摘要压缩

把早期消息压缩成摘要：

```typescript
async function summarizeHistory(messages: Message[]): Message[] {
  const system = messages[0];
  const old = messages.slice(1, -4);      // 旧消息
  const recent = messages.slice(-4);       // 保留最近 4 条

  const summary = await llm.chat({
    messages: [
      { role: 'system', content: '用 2-3 句话总结以下对话的关键信息' },
      ...old,
    ],
  });

  return [
    system,
    { role: 'system', content: `之前对话摘要: ${summary}` },
    ...recent,
  ];
}
```

### 策略 3：Tool 结果压缩

工具返回大量数据时，只保留关键信息：

```typescript
function compressToolResult(result: string, maxLen: number = 500): string {
  if (result.length <= maxLen) return result;
  return result.slice(0, maxLen) + '\n...(结果已截断)';
}
```

## 长期记忆实现

跨对话的记忆需要外部存储：

```
对话 1: 用户偏好 → 保存到文件/数据库
对话 2: 读取用户偏好 → 注入 System Prompt

实现方式:
  - 文件存储: JSON 文件保存关键信息
  - 数据库: SQLite / PostgreSQL
  - 向量库: RAG 检索历史相关内容
```

Cursor 的 `.cursor/rules/` 就是一种长期记忆——把项目规则持久化，每次对话自动加载。

## 状态管理

Agent 需要追踪的状态：

| 状态 | 内容 | 存储位置 |
|------|------|---------|
| 对话历史 | messages 数组 | 内存 |
| 工具中间结果 | 搜索结果、计算值 | messages 中的 tool 消息 |
| 任务进度 | "完成了 3/5 步" | 代码变量 |
| 用户偏好 | "用中文回答" | 外部文件 |
| 环境状态 | 文件系统当前状态 | 需要重新读取 |

## Token 预算管理

```typescript
function estimateTokens(messages: Message[]): number {
  // 粗略估算：1 token ≈ 1.5 个中文字符 / 4 个英文字符
  const text = messages.map(m => m.content || '').join('');
  return Math.ceil(text.length / 1.5);
}

async function agentLoop(question: string) {
  const TOKEN_BUDGET = 100_000;

  for (let step = 0; step < maxSteps; step++) {
    if (estimateTokens(messages) > TOKEN_BUDGET * 0.8) {
      messages = await summarizeHistory(messages);
    }
    // ... 继续执行
  }
}
```

## 核心总结

Agent 的记忆本质上就是**messages 数组的管理**：
- 太短 → Agent 忘记重要信息
- 太长 → 超出 context window / Token 浪费
- 平衡策略：滑动窗口 + 摘要压缩 + 结果截断
