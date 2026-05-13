# Agent 循环

## 从 Function Calling 到 Agent

Function Calling 是**单次**工具调用：用户问 → LLM 调一个工具 → 回答。

Agent 是**循环**调用：LLM 持续观察、思考、行动，直到任务完成。

```
Function Calling（一次性）：
  用户 → LLM → 调工具 → 回答 → 结束

Agent（循环）：
  用户 → LLM → 调工具 A → 看结果 → 还不够
            → 调工具 B → 看结果 → 还不够
            → 调工具 C → 看结果 → 够了
            → 生成最终回答 → 结束
```

这个循环就是 Agent 的核心——**LLM 在每一轮决定是继续行动还是结束**。

## 循环结构

```
           ┌──────────────────────────┐
           │                          │
  用户输入 → Observe → Think → Act ──┘
                                ↓
                          任务完成 → 输出
```

三个阶段：
- **Observe**：观察当前状态（用户输入、上一步工具结果）
- **Think**：LLM 决定下一步（需要调工具？还是直接回答？）
- **Act**：执行决策（调工具 / 输出回答）

## 代码骨架

```typescript
async function agentLoop(
  question: string,
  tools: Tool[],
  maxSteps: number = 10,
) {
  const messages: Message[] = [
    { role: 'system', content: '你是一个有工具的助手。' },
    { role: 'user', content: question },
  ];

  for (let step = 0; step < maxSteps; step++) {
    // Think: LLM 决定下一步
    const response = await llm.chat({ messages, tools });
    const choice = response.choices[0];
    messages.push(choice.message);

    // 判断：LLM 选择了结束还是继续？
    if (choice.finish_reason === 'stop') {
      return choice.message.content;  // 任务完成
    }

    // Act: 执行 LLM 选择的工具
    for (const toolCall of choice.message.tool_calls) {
      const result = await executeTool(toolCall);

      // Observe: 把结果加入上下文
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
    // → 回到循环顶部，LLM 再次 Think
  }

  return '达到最大步数限制';
}
```

核心就是一个 **for 循环 + if 判断**：LLM 返回 `tool_calls` 就继续循环，返回 `stop` 就结束。

## 停止条件

Agent 必须有明确的退出机制，否则会无限循环：

| 条件 | 实现 | 优先级 |
|------|------|--------|
| LLM 自然结束 | `finish_reason === 'stop'` | 正常退出 |
| 最大步数 | `step >= maxSteps` | 防死循环（通常 5-15 步） |
| Token 预算 | 累计 token 接近窗口上限 | 防溢出 |
| 超时 | 总运行时间超阈值 | 防长时间卡住 |

## Agent 循环的典型问题

| 问题 | 原因 | 对策 |
|------|------|------|
| 无限循环 | LLM 重复调用同一工具 | 检测连续重复调用，强制结束 |
| 偏离目标 | 多步后忘记原始任务 | System Prompt 中强调任务目标 |
| Token 爆炸 | 每步结果都在 messages 中累积 | 压缩历史/只保留关键结果 |
| 成本不可控 | 循环次数不可预测 | 设置 Token 预算 + 最大步数 |

## 这个知识点是阶段 4 的地基

后面的 ReAct、Plan-and-Execute、多 Agent 协作，都是**在这个循环基础上的变体**：
- ReAct：循环中加入显式推理步骤
- Plan-and-Execute：先规划再循环执行
- 多 Agent：多个循环协作
