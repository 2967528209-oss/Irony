# CrewAI / AutoGen 多 Agent 框架

## 与 LangChain 的区别

LangChain 侧重**单 Agent 的工具调用链**。CrewAI 和 AutoGen 侧重**多个 Agent 之间的协作**。

```
LangChain：一个 Agent + 多个工具
CrewAI：   多个 Agent + 各自的工具 + 协作协议
AutoGen：  多个 Agent + 自由对话式协作
```

## CrewAI

### 核心概念

| 概念 | 含义 | 对应我们学的 |
|------|------|------------|
| **Agent** | 一个有角色、目标、工具的 AI 实体 | 一个独立的 agentLoop() |
| **Task** | 分配给 Agent 的具体任务 | 函数调用的输入 |
| **Crew** | 一组 Agent 的协作编排 | 多 Agent 协作模式 |
| **Process** | Sequential / Hierarchical | 我们笔记中的协作模式 |

### 设计理念：角色扮演

CrewAI 的特色是把每个 Agent 当作一个**团队成员**，赋予角色、背景、目标：

```
研究员 Agent:
  role: "高级研究分析师"
  goal: "发现关于 AI Agent 的最新技术趋势"
  backstory: "你在顶级科技公司有 10 年研究经验..."
  tools: [search_web, read_paper]

写手 Agent:
  role: "技术博客作者"
  goal: "将研究成果转化为易读的技术文章"
  backstory: "你是一名擅长简化复杂概念的技术作家..."
  tools: []
```

本质上就是**用不同的 System Prompt 创建多个 Agent**。

## AutoGen

### 核心概念

| 概念 | 含义 | 与 CrewAI 的区别 |
|------|------|-----------------|
| **Agent** | 对话参与者 | 更灵活，可以是 LLM/人/代码 |
| **Conversation** | Agent 之间的对话流 | 自由对话而非固定任务 |
| **GroupChat** | 多 Agent 群聊 | 动态决定谁来发言 |

### 设计理念：对话式协作

AutoGen 的特色是让 Agent 之间**像人一样对话**：

```
GroupChat:
  程序员 Agent: "我写了一段代码，请帮我 review"
  审核员 Agent: "第 10 行有个空指针问题"
  程序员 Agent: "修好了，再看一下"
  审核员 Agent: "LGTM，可以合并"
  → 结束
```

它甚至支持**人参与对话**（Human-in-the-loop），人也是一个 Agent。

## 三者对比

| 维度 | LangChain/LangGraph | CrewAI | AutoGen |
|------|-------------------|--------|---------|
| 定位 | 通用 LLM 编排 | 角色扮演团队协作 | 对话式多 Agent |
| Agent 数 | 通常 1 个 | 2-10 个 | 2-N 个 |
| 协作方式 | 图/链编排 | 任务分配 | 自由对话 |
| 人类参与 | 可选 | 可选 | 原生支持 |
| 上手难度 | 中 | 低 | 中 |
| 适合场景 | 复杂工具链 | 内容创作/调研 | 代码生成/review |

## 为什么不需要急着学框架

我们实操写的 ReAct Agent，已经覆盖了这些框架的**底层机制**：

```
我们手写的                 框架对应
──────────────────────────────────────
agentLoop()             → Agent 实例
SYSTEM_PROMPT           → Agent 的 role/goal/backstory
tools 数组              → Agent 的 tools
messages 数组           → Agent 间的消息传递
for 循环 + if 判断       → 协作编排逻辑
compactAfterAnswer()    → Memory 组件
streamAgentStep()       → LLM 调用封装
```

框架的额外价值主要在**工程化**层面：
- 日志/监控/调试工具
- 持久化状态管理
- 并行执行优化
- 生产部署支持

## 选型建议

| 你的需求 | 建议 |
|---------|------|
| 学习原理 | 手写（已完成 ✅） |
| 快速原型 | LangGraph 或 CrewAI |
| 单 Agent + 多工具 | 手写或 LangGraph |
| 多 Agent 团队协作 | CrewAI |
| Agent 间自由对话 | AutoGen |
| 生产系统 | 根据复杂度选择，倾向手写 + 局部框架 |
