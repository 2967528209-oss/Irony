# 阶段 2：LLM API 集成与调用

## 学习目标

- 掌握主流 LLM 的 API 调用方式
- 理解 Streaming、Token 管理、错误处理
- 能封装通用的 LLM 调用层

## 学习路线

| 序号 | 知识点 | 状态 | 笔记 |
|------|--------|------|------|
| 1 | OpenAI API 基础 | 完成 | [01-openai-api.md](notes/01-openai-api.md) |
| 2 | Anthropic API 差异 | 完成 | [02-anthropic-api.md](notes/02-anthropic-api.md) |
| 3 | Streaming 深入 | 完成 | [03-streaming.md](notes/03-streaming.md) |
| 4 | Token 计算与上下文管理 | 完成 | [04-token-management.md](notes/04-token-management.md) |
| 5 | 错误处理与重试策略 | 完成 | [05-error-handling-and-retry.md](notes/05-error-handling-and-retry.md) |
| 6 | Vercel AI SDK + 多模型抽象 | 完成 | [06-vercel-ai-sdk-and-abstraction.md](notes/06-vercel-ai-sdk-and-abstraction.md) |
| 7 | 本地模型部署 | 完成 | [07-local-models.md](notes/07-local-models.md) |
| 8 | **架构总览** | 完成 | [08-architecture-overview.md](notes/08-architecture-overview.md) |

## 实践代码

`llm-sdk/src/` 下的可运行练习（使用 DeepSeek API）：

| 文件 | 内容 | 运行 |
|------|------|------|
| `01-basic-chat.ts` | 基础对话 + Token 统计 | `node --import tsx src/01-basic-chat.ts` |
| `02-stream-chat.ts` | 流式输出 | `node --import tsx src/02-stream-chat.ts` |
| `03-function-calling.ts` | 工具调用完整流程 | `node --import tsx src/03-function-calling.ts` |
| `04-stream-advanced.ts` | 流式进阶：时间统计 + 中断 | `node --import tsx src/04-stream-advanced.ts` |
| `05-multi-turn-chat.ts` | 多轮对话 Token 增长追踪 | `node --import tsx src/05-multi-turn-chat.ts` |
