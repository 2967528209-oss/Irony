# 阶段 2：LLM API 集成与调用

## 学习目标

- 掌握主流 LLM 的 API 调用方式
- 理解 Streaming、Token 管理、错误处理
- 能封装通用的 LLM 调用层

## 学习路线

| 序号 | 知识点 | 状态 | 笔记 |
|------|--------|------|------|
| 1 | OpenAI API 基础 | 进行中 | [01-openai-api.md](notes/01-openai-api.md) |
| 2 | Anthropic API | 待开始 | |
| 3 | Streaming 处理 | 待开始 | |
| 4 | Token 计算与上下文管理 | 待开始 | |
| 5 | 错误处理与重试策略 | 待开始 | |
| 6 | Vercel AI SDK | 待开始 | |
| 7 | 多模型统一抽象层 | 待开始 | |
| 8 | 本地模型部署（Ollama） | 待开始 | |

## 实践项目

1. 封装多模型统一调用 SDK → `llm-sdk/`
2. 流式对话应用 → `chat-app/`
3. Token 用量监控面板 → `token-dashboard/`
