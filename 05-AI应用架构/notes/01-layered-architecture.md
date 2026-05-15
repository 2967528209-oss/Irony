# AI 应用分层架构

## 为什么需要分层

前面 4 个阶段，我们写的代码都是「脚本级」——一个文件搞定所有事情。
生产级 AI 应用需要分层，原因和传统后端分层一样：**职责隔离、独立演进、可替换**。

## 四层架构

```
┌────────────────────────────────────────────┐
│  接入层 (Gateway)                           │
│  HTTP API / WebSocket / QQ Bot / 微信公众号   │
│  职责：认证、限流、协议转换                     │
├────────────────────────────────────────────┤
│  编排层 (Orchestration)                     │
│  Agent 循环 / RAG Pipeline / 工作流引擎       │
│  职责：业务逻辑、工具调度、多步编排              │
├────────────────────────────────────────────┤
│  模型层 (Model)                             │
│  LLM 调用 / Embedding / Reranker            │
│  职责：统一模型接口、重试、降级、缓存            │
├────────────────────────────────────────────┤
│  数据层 (Data)                              │
│  向量库 / 关系库 / 缓存 / 文件存储             │
│  职责：持久化、检索、状态管理                    │
└────────────────────────────────────────────┘
```

## 用我们的项目来理解

### QQ Bot 项目映射

```
接入层:  WebSocket 连接 NapCat + OneBot 消息解析
         ↓
编排层:  handleMessage() 判断触发词 → chat() 调用 DeepSeek
         ↓
模型层:  deepseekClient.chat.completions.create()
         ↓
数据层:  userHistories Map (内存存储对话历史)
```

### ReAct Agent 项目映射

```
接入层:  readline 命令行交互 + /stats /history 等指令
         ↓
编排层:  agentLoop() → streamAgentStep() → executeTool()
         ↓
模型层:  deepseekClient (生成) + ollamaClient (embedding)
         ↓
数据层:  vector-store.json (向量库) + conversationMessages (对话历史)
```

## 每层的设计要点

### 接入层

| 职责 | 说明 |
|------|------|
| 协议转换 | QQ 消息 → 标准格式 → LLM 输入 |
| 认证 | API Key 验证、用户身份识别 |
| 限流 | 每用户每分钟 N 次请求 |
| 输入清洗 | 过滤恶意输入、长度限制 |

关键：**接入层不包含业务逻辑**。换一个接入方式（QQ → 微信 → HTTP API），编排层代码不需要改。

### 编排层

这一层是**业务核心**，前面学的所有模式都在这里：

```
简单问答     → 直接调模型层
RAG 问答     → 检索 → 模型层
Agent 任务   → 循环调模型层 + 工具
多步工作流   → Plan → 逐步 Execute
```

关键：编排层**不关心用哪个模型**。它只调模型层的统一接口，不直接 `new OpenAI()`。

### 模型层

把所有模型调用封装成统一接口：

```typescript
// 统一接口
interface ModelService {
  chat(messages: Message[], options?: ChatOptions): Promise<string>;
  embed(text: string): Promise<number[]>;
}

// 实现可以是 DeepSeek、Grok、Claude...
// 编排层不需要知道具体是哪个模型
```

这一层处理：
- **重试**：API 超时自动重试
- **降级**：主模型挂了切备用模型
- **缓存**：相同输入直接返回缓存结果
- **统计**：Token 消耗、延迟监控

### 数据层

| 数据类型 | 存储方案 | 我们用过的 |
|---------|---------|-----------|
| 向量数据 | pgvector / Chroma | vector-store.json |
| 对话历史 | Redis / PostgreSQL | 内存 Map |
| 用户数据 | PostgreSQL / MySQL | 无 |
| 文件/文档 | S3 / 本地文件系统 | Markdown 文件 |
| 缓存 | Redis | 无 |

## 分层的实际价值

```
场景：把 QQ Bot 改成微信公众号 Bot

不分层（当前状态）：
  → bot.ts 里混着 QQ 协议解析、DeepSeek 调用、消息发送
  → 换微信要重写大量代码

分层后：
  → 只换接入层（QQ adapter → 微信 adapter）
  → 编排层、模型层、数据层不动
```

```
场景：DeepSeek 临时挂了，切换到 Grok

不分层：
  → 在编排层代码里到处找 deepseekClient 替换

分层后：
  → 模型层切一下配置，编排层无感知
```

## 不要过度设计

对于学习项目和小型应用，分层是一种**思维方式**，不一定要物理拆分成多个文件/模块。

```
✅ 脑中有分层意识，代码逻辑上按层组织
❌ 一个小 Bot 硬拆成 4 个微服务
```

先能区分「这段代码属于哪一层」就够了，等系统复杂了再做物理拆分。
