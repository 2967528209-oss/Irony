# 可观测性

## 传统应用 vs AI 应用的可观测性

传统应用的可观测性：日志 + 指标 + 链路追踪，关注的是**延迟、错误率、吞吐量**。

AI 应用多了一层：**你不仅要知道请求成不成功，还要知道回答好不好**。

```
传统应用：请求成功了吗？花了多长时间？
AI 应用： 请求成功了吗？花了多长时间？回答正确吗？用了多少 Token？哪个 Prompt 版本效果好？
```

## AI 可观测性的四个维度

### 1. 调用追踪（Tracing）

追踪一次用户请求的完整链路：

```
用户: "什么是 RAG？"
  ├── [0ms]   接入层：收到消息
  ├── [5ms]   安全检查：通过
  ├── [10ms]  RAG 检索
  │     ├── [10ms]  Embedding API 调用 (bge-m3, 50ms, 200 tokens)
  │     └── [60ms]  向量检索 (top-3, 15ms)
  ├── [75ms]  LLM 生成
  │     └── [75ms]  DeepSeek API (输入 800 tokens, 输出 300 tokens, 2.1s)
  └── [2175ms] 返回结果
```

每个步骤（Span）记录：开始时间、耗时、输入输出、Token 消耗。

### 2. 指标监控（Metrics）

| 指标 | 含义 | 告警阈值 |
|------|------|---------|
| 请求量 | 每分钟调用次数 | 突增 5 倍 |
| 延迟 P95 | 95% 请求的响应时间 | > 10s |
| 错误率 | 调用失败比例 | > 5% |
| Token 消耗/天 | 每日总 Token 用量 | 超预算 80% |
| 缓存命中率 | 命中缓存的比例 | < 10%（缓存没效果） |

### 3. 质量评估（Evaluation）

最独特的部分——AI 回答的**质量**需要持续监控：

```
定期评估：
  用固定测试集跑一遍 → 计算 Recall、Faithfulness 等指标
  → 发现指标下降 → 排查原因（数据变了？Prompt 改了？模型更新了？）

用户反馈：
  用户点赞/点踩 → 标记好/差回答 → 积累评估数据
```

你在阶段 3 做的 `06-evaluation.ts` 就是质量评估的雏形。

### 4. 日志记录（Logging）

AI 应用的日志需要记录更多信息：

```typescript
interface LLMCallLog {
  timestamp: string;
  request_id: string;
  user_id: string;
  model: string;
  messages_count: number;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  finish_reason: string;
  tools_called: string[];
  prompt_version: string;
  // 注意：不要记录完整的 messages 内容（隐私 + 存储成本）
}
```

## 工具选择

### 开源方案

| 工具 | 定位 | 特点 |
|------|------|------|
| **Langfuse** | AI 专用可观测性 | Prompt 管理 + 追踪 + 评估，开源可自部署 |
| **LangSmith** | LangChain 官方 | 与 LangChain 深度集成 |
| **Phoenix** | Arize 开源 | LLM 评估 + 追踪 |

### 自建方案

对于小项目，不需要引入复杂工具。核心就是**结构化日志 + 简单统计**：

```typescript
function logLLMCall(data: LLMCallLog) {
  // 写到文件或数据库
  console.log(JSON.stringify(data));
}
```

我们 Agent 中的 `/stats` 指令就是最简单的可观测性实现：

```
📊 会话统计:
   API 调用: 5 次
   工具调用: 3 次
   输入 Token: 4.2k
   输出 Token: 1.8k
   总 Token: 6.0k
   记忆压缩: 1 次
```

## 从简到繁的实现路径

| 阶段 | 做什么 | 工具 |
|------|--------|------|
| 开发阶段 | console.log + /stats 指令 | 我们当前的做法 |
| 上线初期 | 结构化日志 + Token 统计 | 文件日志 / SQLite |
| 增长期 | 链路追踪 + 质量评估 | Langfuse / 自建 |
| 规模化 | 全链路监控 + 告警 + 仪表盘 | Langfuse + Grafana |

## 核心原则

**先能看到数据，再决定怎么优化。**

可观测性不是锦上添花，是**你知道系统在干什么**的基础。没有可观测性，成本优化、质量改进、安全审计都无从谈起。
