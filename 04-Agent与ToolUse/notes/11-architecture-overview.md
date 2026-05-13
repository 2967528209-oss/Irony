# 阶段 4 架构总览：Agent 与 Tool Use

## 核心理解

整个 Agent 体系可以用一句话概括：

> **Agent = LLM + 工具 + 循环。LLM 做决策，工具做执行，循环做编排。**

所有的变体（ReAct、Plan-and-Execute、多 Agent）都是在这三个要素上做不同的组合。

## 从底层到顶层的四层架构

```
┌────────────────────────────────────────────────────┐
│  第 4 层：多 Agent 系统                              │
│  CrewAI / AutoGen / 自定义 Supervisor                │
│  多个 Agent 协作完成复杂任务                          │
├────────────────────────────────────────────────────┤
│  第 3 层：Agent 编排模式                              │
│  ReAct / Plan-and-Execute / 混合模式                 │
│  控制 Agent "怎么走"                                 │
├────────────────────────────────────────────────────┤
│  第 2 层：Agent 循环                                 │
│  for 循环 + finish_reason 判断                       │
│  LLM 在每轮决定继续还是停止                           │
├────────────────────────────────────────────────────┤
│  第 1 层：Function Calling                           │
│  LLM 决策（选工具 + 填参数）→ 代码执行 → 结果返回       │
│  两轮 API 调用                                       │
└────────────────────────────────────────────────────┘
```

每一层都建立在下一层之上：
- Function Calling 是原子操作
- Agent 循环把它变成可重复的流程
- 编排模式决定循环的策略
- 多 Agent 系统把多个循环组合起来

## 实践项目映射

我们手写的 ReAct Agent 覆盖了前三层：

| 架构层 | 代码对应 |
|--------|---------|
| Function Calling | `tools` 数组定义 + `executeTool()` 执行 |
| Agent 循环 | `agentLoop()` 的 for 循环 + finish_reason 判断 |
| ReAct 模式 | `streamAgentStep()` 输出 Thought → Action → Observation |
| 记忆管理 | `compactAfterAnswer()` + `summarizeHistory()` + Token 估算 |
| 工具安全 | `calculate()` 中的 sanitize + 参数校验 |
| 可观察性 | Step 指示 + Token 消耗显示 + /stats /history 指令 |

## 关键设计决策

### 1. 单 Agent vs 多 Agent

```
工具 < 10 个 且 角色单一       → 单 Agent（我们的实践）
工具 > 15 个 或 需要不同专业    → 多 Agent
需要审核/检查机制              → 多 Agent（执行者 + 审核者）
```

### 2. ReAct vs Plan-and-Execute

```
探索性任务、信息不确定          → ReAct（边想边做）
步骤明确的多步任务             → Plan-and-Execute（先规划后执行）
实际系统                      → 混合（先规划大方向，执行时用 ReAct）
```

### 3. 手写 vs 框架

```
学习阶段 / 简单 Agent          → 手写（已完成 ✅）
快速原型                      → LangGraph / CrewAI
生产系统                      → 手写核心 + 局部用框架
```

### 4. 记忆策略

```
当前轮：完整保留所有中间步骤（工具结果、推理过程）
跨轮：只保留 用户问题 + 回答摘要，丢弃中间过程
超阈值：LLM 自动生成摘要压缩
```

## 安全架构

```
用户输入 → [输入清洗] → LLM 决策 → [参数校验] → [权限检查] → 工具执行
                                                              ↓
                                                    [沙箱隔离 / 确认机制]
```

三层防护：工具设计约束 → 执行前校验 → 运行时隔离

## 与 Cursor 的对应关系

| 我们学的概念 | Cursor 中的体现 |
|------------|----------------|
| Function Calling | Cursor 调用 Read/Write/Shell 等工具 |
| Agent 循环 | 一轮对话中多次工具调用直到完成 |
| ReAct 模式 | 显示推理过程 → 调用工具 → 观察结果 |
| Plan-and-Execute | 复杂任务时先输出"我的计划是..." |
| 多 Agent | Task 子任务功能 |
| 工具安全 | 沙箱执行、required_permissions |
| 记忆管理 | 长对话自动摘要、.cursor/rules 长期记忆 |
| Tool Schema | 每个工具的参数定义和 description |

## 与阶段 3（RAG）的关系

RAG 和 Agent 是互补的：

```
RAG: 给 LLM "知识"
Agent: 给 LLM "能力"

RAG + Agent = 有知识又有能力的 AI 系统

实际应用：
  Agent 工具之一 = search_knowledge（RAG 检索）
  Agent 根据检索结果决定是否需要更多信息
  → Agentic RAG
```

我们实操中的 `search_knowledge` 工具就是 RAG → Agent 的桥梁。

## 阶段 4 学习路径回顾

```
Function Calling（原子操作）
  ↓
Tool Schema 设计（怎么定义好工具）
  ↓
Agent 循环（把单次变成循环）
  ↓
ReAct 模式（循环中加推理）         ← 实操：构建交互式 Agent
  ↓
Plan-and-Execute（先规划后执行）
  ↓
多 Agent 协作（多个循环协作）
  ↓
工具安全（防护机制）
  ↓
记忆管理（上下文控制）             ← 实操：Token 追踪 + 自动压缩
  ↓
框架认知（LangChain / CrewAI / AutoGen）
```

每个知识点都建立在前一个之上，从最小的原子操作到完整的 Agent 系统。
