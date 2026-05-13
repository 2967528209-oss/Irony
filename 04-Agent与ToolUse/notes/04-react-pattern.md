# ReAct 模式

## 什么是 ReAct

ReAct = **Re**asoning + **Act**ing。在 Agent 循环的基础上，让 LLM **每一步先说出推理过程再行动**。

```
普通 Agent：
  用户: "对比 React 和 Vue 的性能"
  LLM: → search("React Vue 性能")  ← 直接行动，没有解释为什么

ReAct Agent：
  用户: "对比 React 和 Vue 的性能"
  LLM:
    Thought: 用户想对比两个框架，我需要分别搜索各自的性能数据
    Action:  search("React 性能基准测试")
    Observation: React 虚拟 DOM diff 速度...
    Thought: 拿到了 React 的数据，现在需要 Vue 的
    Action:  search("Vue 3 性能基准测试")
    Observation: Vue 3 响应式系统...
    Thought: 两个框架的数据都有了，可以对比回答了
    Answer:  从性能角度看...
```

## 核心价值

| 价值 | 说明 |
|------|------|
| **可观察性** | 能看到 LLM 为什么选择这个工具，方便调试 |
| **更好的决策** | 先推理再行动，减少盲目调用 |
| **自我纠错** | LLM 在 Thought 中可以反思上一步是否有效 |

## 两种实现方式

### 方式 1：Prompt 引导（Thought 是文本）

在 System Prompt 中要求 LLM 按固定格式输出：

```
你是一个助手，按以下格式思考和行动：
  Thought: 分析当前情况
  Action: 工具名(参数)
  Observation: [系统自动填入工具结果]
  ...重复...
  Answer: 最终回答
```

缺点：需要解析文本提取 Action，容易出格式错误。

### 方式 2：利用 Tool Call 原生能力（推荐）

LLM 的 `content` 字段自然就是 Thought，`tool_calls` 就是 Action：

```typescript
const response = await client.chat.completions.create({
  model: 'deepseek-chat',
  messages,
  tools,
});

const msg = response.choices[0].message;
// msg.content = "用户想查天气，我需要调用天气工具"  ← Thought（自然语言推理）
// msg.tool_calls = [{ function: { name: 'get_weather', ... } }]  ← Action

// Observation = 工具执行结果，由代码填入
```

不需要额外的格式约定，Function Calling 的返回结构天然支持 ReAct。

## ReAct vs 普通 Agent

| 维度 | 普通 Agent | ReAct Agent |
|------|-----------|------------|
| 决策过程 | 隐式（看不到为什么选这个工具） | 显式（Thought 解释推理） |
| 调试体验 | 只能看工具调用和结果 | 能追踪完整推理链路 |
| 多步任务 | 容易偏离目标 | 推理引导方向，更稳定 |
| Token 消耗 | 较少 | 较多（Thought 额外占 token） |
| 适用场景 | 简单直接的任务 | 复杂多步推理任务 |

## 在 Cursor 中的体现

你每天在用的 Cursor Agent 就是 ReAct 模式：

```
你: "给这个函数加单元测试"

Cursor Agent:
  Thought: 需要先读取函数代码了解它的功能
  Action:  Read(file.ts)
  Observation: function add(a, b) { return a + b; }
  Thought: 这是一个加法函数，我来写测试
  Action:  Write(file.test.ts, ...)
  Thought: 测试写好了，运行一下验证
  Action:  Shell("npm test")
  Observation: ✅ 1 test passed
  Answer: 测试已添加并通过
```

你在 Cursor 的对话中看到的"思考过程"和"工具调用"，就是 ReAct 模式的可视化呈现。
