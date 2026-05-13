# LangChain / LangGraph Agent 框架

## LangChain 是什么

LangChain 是 LLM 应用开发的**工具箱**——把常用操作（调 LLM、解析输出、检索文档、调工具）封装成标准组件，通过 Chain（链）串联起来。

```
没有 LangChain：
  自己写 API 调用 → 自己解析 JSON → 自己管理 messages → 自己实现 Agent 循环

有 LangChain：
  model = ChatOpenAI()
  tools = [SearchTool(), CalculatorTool()]
  agent = create_react_agent(model, tools)
  result = agent.invoke("你的问题")
```

## 核心概念

| 概念 | 对应我们实操中的 | 作用 |
|------|----------------|------|
| **Model** | `deepseekClient.chat.completions.create()` | 统一的 LLM 调用接口 |
| **Prompt Template** | `SYSTEM_PROMPT` 字符串 | 模板化的提示词管理 |
| **Tool** | `tools` 数组 + `executeTool()` | 工具定义和执行 |
| **Chain** | 手写的函数调用流程 | 把多个步骤串成一个管道 |
| **Agent** | `agentLoop()` 函数 | 带工具的 LLM 循环 |
| **Memory** | `conversationMessages` 数组 | 对话历史管理 |

关键理解：LangChain 封装的每一层，你在实操项目中都**手写实现过了**。框架的价值是减少重复代码，而不是引入新概念。

## LangGraph 是什么

LangGraph 是 LangChain 团队推出的**状态图编排框架**。如果说 LangChain 是"链式"调用，LangGraph 是"图式"调用——支持分支、循环、并行。

```
LangChain Chain（线性）：
  A → B → C → 输出

LangGraph Graph（图）：
  A → B → 判断 → C（满足条件）
                → D（不满足）→ 回到 B（循环）
```

## LangGraph 对应的架构概念

| LangGraph 概念 | 对应我们学的 | 说明 |
|----------------|------------|------|
| **Node** | Agent 循环中的每个步骤 | 一个处理单元 |
| **Edge** | if/else 判断逻辑 | 决定下一步走哪个 Node |
| **Conditional Edge** | `finish_reason === 'stop'` | 条件分支 |
| **State** | `messages` 数组 | 在 Node 间传递的共享状态 |
| **Graph** | 整个 `agentLoop()` | 所有 Node + Edge 的组合 |

```
用 LangGraph 实现 ReAct Agent：

  const graph = new StateGraph()
    .addNode("agent",   callModel)       // Think: 调 LLM
    .addNode("tools",   executeTool)     // Act: 执行工具
    .addEdge("__start__", "agent")       // 入口
    .addConditionalEdge("agent", shouldContinue, {
      continue: "tools",                 // 有 tool_calls → 执行工具
      end: "__end__",                    // 无 tool_calls → 结束
    })
    .addEdge("tools", "agent")           // 工具结果 → 回到 LLM
    .compile();
```

这个图结构和我们手写的 `for + if` 循环是**等价的**。

## 要不要用框架

| 维度 | 手写（我们的方式） | LangChain/LangGraph |
|------|-------------------|-------------------|
| 学习价值 | 高（理解底层原理） | 低（黑盒调用） |
| 开发速度 | 慢 | 快 |
| 灵活性 | 完全可控 | 受框架约束 |
| 调试 | 容易（代码透明） | 较难（抽象层多） |
| 生产就绪 | 需要自己完善 | 内置最佳实践 |
| 依赖 | 极少 | 重依赖（LangChain 包很大） |

### 建议

1. **学习阶段**：手写实现（我们正在做的），理解原理
2. **原型验证**：LangChain 快速搭建
3. **生产系统**：根据复杂度选择
   - 简单 Agent → 手写（代码量少，维护简单）
   - 复杂图结构 → LangGraph（状态管理、并行、持久化）

## 行业趋势

LangChain 经历了"热门 → 争议 → 沉淀"的过程：
- 早期：几乎是 LLM 应用的默认框架
- 争议：过度抽象、调试困难、API 频繁变动
- 现在：核心简化，LangGraph 成为主推方向

越来越多团队选择**轻量手写 + 局部用框架**的方式，而不是全盘依赖 LangChain。
