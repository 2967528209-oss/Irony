# Irony-s

# 全栈 AI Coding 开发学习路径

> 目标：掌握从需求到交付的闭环全栈 AI 应用开发能力，以 AI Coding 为核心工作方式。
> 前提：已具备前后端开发基础，前后端实现交给 AI Coding 完成。

---

## 阶段总览

| 阶段 | 主题 | 预期周期 | 核心产出 |
|------|------|----------|----------|
| 1 | AI Coding 工作流 | 1 周 | 建立高效的人机协作开发模式 |
| 2 | LLM API 集成与调用 | 1-2 周 | 掌握主流模型 API 集成能力 |
| 3 | RAG 系统开发 | 2-3 周 | 构建生产级知识库问答系统 |
| 4 | Agent 与 Tool Use | 2-3 周 | 构建多工具智能 Agent |
| 5 | AI 应用架构模式 | 2-3 周 | 掌握生产级 AI 应用设计模式 |
| 6 | 全栈 AI 产品实战 | 3-4 周 | 独立交付完整 AI 产品 |

---

## 阶段 1：AI Coding 工作流

### 学习目标
- 建立系统化的 AI 辅助开发工作流
- 掌握 Cursor 高级功能与 Rules 体系
- 形成"需求 → Prompt → 代码 → 验证"的闭环

### 知识清单
- [ ] Cursor Rules 体系设计（项目级 / 全局级 / 文件级）
- [ ] 结构化 Prompt 驱动开发（需求描述 → 代码生成 → 迭代优化）
- [ ] 上下文管理策略（@file, @folder, @web, @docs）
- [ ] AI Coding 最佳实践（任务拆分, 增量开发, 验证闭环）
- [ ] MCP（Model Context Protocol）集成与使用
- [ ] 多模型切换策略（不同任务选择不同模型）

### 实践项目
1. 设计一套项目 Cursor Rules 模板（覆盖全栈开发场景）
2. 用纯 AI Coding 方式从 0 构建一个 CRUD 应用（记录全过程）
3. 配置并使用 MCP 工具扩展 Cursor 能力

### 交付标准
- 有一套可复用的 Rules 模板
- 能在 30 分钟内用 AI Coding 方式启动一个新项目

---

## 阶段 2：LLM API 集成与调用

### 学习目标
- 掌握主流 LLM 的 API 调用方式
- 理解 Streaming、Token 管理、错误处理
- 能封装通用的 LLM 调用层

### 知识清单
- [ ] OpenAI API（Chat Completions, Streaming, Function Calling）
- [ ] Anthropic API（Messages API, Tool Use, System Prompt）
- [ ] 本地模型部署与调用（Ollama, vLLM）
- [ ] Streaming 处理（SSE, ReadableStream, 前端渲染）
- [ ] Token 计算与上下文窗口管理
- [ ] 多模型统一抽象层设计
- [ ] 错误处理与重试策略（Rate Limit, Timeout, Fallback）
- [ ] Vercel AI SDK 使用（useChat, useCompletion, streamText）

### 实践项目
1. 封装一个多模型统一调用 SDK（支持 OpenAI / Claude / 本地模型）
2. 实现一个流式对话应用（带打字机效果 + 中断能力）
3. 构建一个 Token 用量监控面板

### 交付标准
- 有一个可复用的 LLM SDK 封装
- 能正确处理流式响应、错误重试、上下文截断

---

## 阶段 3：RAG 系统开发

### 学习目标
- 掌握 RAG（检索增强生成）完整链路
- 理解 Embedding、向量检索、重排序
- 能构建生产级知识库问答系统

### 知识清单
- [ ] RAG 架构全景（Naive RAG → Advanced RAG → Modular RAG）
- [ ] 文档处理（加载, 解析, 清洗 — PDF/Markdown/HTML/代码）
- [ ] 文本分块策略（固定大小, 语义分块, 递归分块）
- [ ] Embedding 模型（OpenAI, Cohere, BGE, 本地模型）
- [ ] 向量数据库（Pinecone / Weaviate / pgvector / Chroma）
- [ ] 检索策略（相似度搜索, 混合检索, MMR）
- [ ] 重排序（Reranker）与结果过滤
- [ ] Query 改写与分解（HyDE, Step-back, Multi-query）
- [ ] 引用追溯与来源标注
- [ ] 评估体系（Faithfulness, Relevance, RAGAS）

### 实践项目
1. 构建一个文档知识库（支持 PDF/MD 导入 + 语义检索）
2. 实现 Advanced RAG（含 Query 改写 + 重排序 + 引用标注）
3. 搭建 RAG 评估管线（自动化测试检索质量与回答质量）

### 交付标准
- 有一个可用的 RAG 系统（能导入文档并回答问题）
- 理解并能优化检索质量（Recall/Precision 可量化）

---

## 阶段 4：Agent 与 Tool Use

### 学习目标
- 掌握 AI Agent 的核心设计模式
- 能实现 Function Calling / Tool Use
- 构建可扩展的多工具 Agent

### 知识清单
- [ ] Function Calling 机制（OpenAI / Claude 的实现差异）
- [ ] Tool 定义与 Schema 设计（JSON Schema, 参数校验）
- [ ] Agent 循环（Observe → Think → Act → Observe）
- [ ] ReAct 模式实现
- [ ] Plan-and-Execute 模式
- [ ] 多 Agent 协作（Supervisor, Sequential, Hierarchical）
- [ ] 工具安全性（沙箱执行, 权限控制, 确认机制）
- [ ] 对话记忆与状态管理（短期/长期记忆）
- [ ] LangChain / LangGraph Agent 框架
- [ ] CrewAI / AutoGen 多 Agent 框架

### 实践项目
1. 实现一个带工具的 Agent（网页搜索 + 代码执行 + 文件操作）
2. 用 LangGraph 构建一个有状态的工作流 Agent
3. 构建一个多 Agent 协作系统（如：研究员 + 编辑 + 审核员）

### 交付标准
- 能设计和实现自定义 Tool
- 有一个可运行的多工具 Agent
- 理解 Agent 的失败模式与防护策略

---

## 阶段 5：AI 应用架构模式

### 学习目标
- 掌握生产级 AI 应用的架构设计
- 理解成本控制、安全防护、可观测性
- 能做出合理的技术决策

### 知识清单
- [ ] AI 应用分层架构（接入层 / 编排层 / 模型层 / 数据层）
- [ ] Prompt 管理与版本控制
- [ ] 输出结构化（JSON Mode, Structured Output, Zod Schema）
- [ ] 安全防护（Prompt Injection 检测, 内容审核, PII 过滤）
- [ ] 成本优化（模型路由, 缓存策略, Prompt 压缩）
- [ ] 可观测性（LangSmith / Langfuse 追踪, Token 统计）
- [ ] 异步任务与队列（长时间推理, 批处理）
- [ ] 多租户隔离与限流
- [ ] A/B 测试与模型评估
- [ ] 边缘场景处理（幻觉检测, 拒答策略, 降级方案）

### 实践项目
1. 为已有 AI 应用添加完整的可观测性（追踪 + 评估 + 告警）
2. 实现一个 Prompt 管理系统（版本管理 + A/B 测试）
3. 构建模型路由器（根据任务复杂度自动选择模型）

### 交付标准
- 理解 AI 应用的生产级关注点
- 能设计成本可控、安全可靠的 AI 应用架构

---

## 阶段 6：全栈 AI 产品实战

### 学习目标
- 从 0 到 1 交付完整 AI 产品
- 全程使用 AI Coding 工作方式
- 形成可复制的产品开发方法论

### 毕业项目（选一或自定义）

#### 项目 A：AI 知识助手 SaaS
- 多数据源接入（文档/网页/API）
- RAG + Agent 混合架构
- 多轮对话 + 引用追溯
- 用户系统 + 多租户 + 计费
- 部署上线 + 监控

#### 项目 B：AI Coding 工具
- 代码解读 / 重构 / 测试生成
- 项目级上下文感知
- 自定义规则引擎
- VS Code 插件或 Web IDE
- MCP Server 开发

#### 项目 C：AI Workflow 平台
- 可视化工作流编排
- 多 Agent 调度引擎
- 自定义节点/插件体系
- Webhook + 定时触发
- 执行历史 + 调试工具

### 交付标准
- 完整的产品（可部署访问）
- 技术文档 + 架构图
- 开发复盘文档（AI Coding 效率分析）

---

## 学习原则

1. **AI Coding First**：所有代码实现优先通过 AI 完成，人工负责架构决策和质量把关
2. **项目驱动**：每个知识点必须落地到可运行的项目中
3. **MVP 迭代**：先做最小可用版本，再逐步增强
4. **沉淀复用**：代码模板、Prompt 模板、架构模式都沉淀到本目录
5. **量化进度**：用 Checklist 追踪，用项目交付证明掌握

---

## 目录结构

```
AI/
├── 学习路径.md              # 本文件
├── 01-AI-Coding工作流/      # 阶段 1
├── 02-LLM-API集成/         # 阶段 2
├── 03-RAG系统/             # 阶段 3
├── 04-Agent开发/           # 阶段 4
├── 05-AI架构模式/          # 阶段 5
├── 06-全栈实战/            # 阶段 6（毕业项目）
└── resources/              # 公共资源（模板、配置、笔记）
```

---

## 进度追踪

| 日期 | 阶段 | 完成内容 | 备注 |
|------|------|----------|------|
| 2026-05-12 | 启动 | 建立学习路径 | 聚焦 AI 应用开发 |

---

*最后更新：2026-05-12*
