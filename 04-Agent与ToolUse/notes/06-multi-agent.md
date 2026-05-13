# 多 Agent 协作

## 为什么需要多 Agent

单个 Agent 的局限：
- 工具太多时选择准确率下降
- System Prompt 太长时指令遵循变差
- 一个角色难以兼顾多种专业能力

多 Agent 的思路：**每个 Agent 专注一个角色，通过协作完成复杂任务**。

```
单 Agent：一个人又当厨师又当服务员又当收银员
多 Agent：厨师做菜、服务员上菜、收银员结账 → 各司其职
```

## 三种协作模式

### 1. Sequential（顺序流水线）

```
Agent A → Agent B → Agent C → 最终结果
研究员     编辑       审核员

Agent A 输出 = Agent B 输入
Agent B 输出 = Agent C 输入
```

适用：任务有明确的前后依赖关系

例子：内容生产
```
研究员 Agent（搜索资料）
  → 写手 Agent（撰写文章）
    → 审核 Agent（检查质量）
      → 最终文章
```

### 2. Supervisor（主管调度）

```
         Supervisor Agent
        /       |        \
  Agent A   Agent B   Agent C
  搜索员     分析师     写手

Supervisor 决定：
  先让 A 搜索 → 把结果给 B 分析 → 把分析给 C 撰写
```

适用：需要动态决策"下一步找谁做"

Supervisor 本身也是一个 Agent，它的"工具"就是**调用其他 Agent**。

### 3. Hierarchical（层级嵌套）

```
         总管 Agent
        /          \
  团队 A 主管     团队 B 主管
  /     \          /     \
Agent  Agent    Agent  Agent
```

适用：超大规模复杂任务

## 实现本质

多 Agent 的实现比想象中简单——**每个 Agent 就是一个独立的 Agent 循环，通过消息传递协作**：

```typescript
// 每个 Agent 有自己的 System Prompt 和工具集
const researcher = createAgent('你是研究员', [search_web, search_db]);
const analyst   = createAgent('你是数据分析师', [calculate, chart]);
const writer    = createAgent('你是技术作家', []);

// Sequential 模式
const data = await researcher.run('搜索 RAG 技术栈');
const analysis = await analyst.run(`分析以下数据: ${data}`);
const report = await writer.run(`基于分析撰写报告: ${analysis}`);

// Supervisor 模式
const supervisor = createAgent('你是项目经理', [
  callAgent(researcher),  // 工具 = 调用其他 Agent
  callAgent(analyst),
  callAgent(writer),
]);
const result = await supervisor.run('帮我做一份 RAG 技术调研报告');
```

关键洞察：Supervisor 模式中，**其他 Agent 就是 Supervisor 的"工具"**。

## 在 Cursor 中的体现

Cursor 的 Task（子任务）功能就是多 Agent 协作的实际应用：

```
主 Agent（你的对话）
  ↓ 发现任务复杂，拆分子任务
  ├── Sub-agent 1: 搜索代码库
  ├── Sub-agent 2: 修改文件 A
  └── Sub-agent 3: 修改文件 B
  ↓ 子任务完成，汇总结果
最终回答
```

## 多 Agent 的问题

| 问题 | 原因 | 对策 |
|------|------|------|
| Agent 间信息丢失 | 传递时丢掉上下文 | 结构化消息格式 |
| 成本倍增 | 每个 Agent 独立消耗 token | 控制 Agent 数量和步数 |
| 调试困难 | 多个 Agent 交互链路复杂 | 每个 Agent 记录推理日志 |
| 死循环 | Agent 互相调用 | 限制嵌套深度 |

## 何时用多 Agent vs 单 Agent

| 场景 | 建议 |
|------|------|
| 工具 < 10 个 | 单 Agent |
| 任务可以一个角色搞定 | 单 Agent |
| 不同步骤需要不同专业知识 | 多 Agent |
| 工具 > 15 个需要分组 | 多 Agent（每组一个 Agent） |
| 需要检查/审核机制 | 多 Agent（执行者 + 审核者） |
