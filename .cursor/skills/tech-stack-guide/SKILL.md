---
name: tech-stack-guide
description: >-
  定义项目技术栈选型偏好、框架选择优先级和核心依赖。
  初始化新项目、选择技术方案、引入新依赖时使用。
disable-model-invocation: false
---

# 技术栈选型指南

## 前端

| 层级 | 首选 | 备选 | 说明 |
|------|------|------|------|
| 框架 | Next.js (App Router) | Vite + React | 全栈场景用 Next.js，纯前端用 Vite |
| 语言 | TypeScript | — | 强制使用 TypeScript，strict 模式 |
| 样式 | Tailwind CSS | CSS Modules | Tailwind 优先，复杂组件可用 CSS Modules |
| UI 组件库 | shadcn/ui | Radix UI | shadcn/ui 基于 Radix，可定制性强 |
| 状态管理 | Zustand | React Context | 轻量场景用 Context，复杂状态用 Zustand |
| 表单 | React Hook Form + Zod | — | Zod 负责校验与类型推导 |
| 数据请求 | TanStack Query | SWR | TanStack Query 功能更完整 |
| AI 交互 | Vercel AI SDK | — | useChat / useCompletion / streamText |

## 后端

| 层级 | 首选 | 备选 | 说明 |
|------|------|------|------|
| 运行时 | Node.js | Python (FastAPI) | AI 密集型任务用 Python |
| 框架 (Node) | Next.js API Routes / Hono | Express | 全栈项目直接用 Next.js API Routes |
| 框架 (Python) | FastAPI | Flask | FastAPI 异步性能好，类型支持强 |
| ORM | Drizzle ORM | Prisma | Drizzle 更轻量，SQL-like 体验 |
| 校验 | Zod (TS) / Pydantic (Python) | — | 运行时校验 + 类型推导 |
| 认证 | NextAuth.js (Auth.js) | 自研 JWT | 标准 OAuth 场景用 Auth.js |

## 数据存储

| 用途 | 首选 | 备选 | 说明 |
|------|------|------|------|
| 关系型数据 | PostgreSQL | SQLite | 生产用 PG，原型/学习可用 SQLite |
| 向量存储 | pgvector | Pinecone / Chroma | pgvector 与 PG 统一，减少运维 |
| 缓存 | Redis | 内存缓存 | 需要持久化或分布式场景用 Redis |
| 对象存储 | S3 / R2 | 本地文件系统 | 生产环境用云存储 |

## AI / LLM

| 层级 | 首选 | 备选 | 说明 |
|------|------|------|------|
| LLM 调用 | Vercel AI SDK | LangChain | AI SDK 更轻量，LangChain 适合复杂编排 |
| Embedding | OpenAI text-embedding-3-small | BGE / Cohere | OpenAI 性价比高 |
| Agent 框架 | LangGraph | CrewAI / AutoGen | 状态机模式，可控性强 |
| Prompt 管理 | 代码内模板 | Langfuse | 早期代码管理，规模大后用平台 |
| 可观测性 | Langfuse | LangSmith | 开源可自部署 |

## DevOps

| 层级 | 首选 | 备选 | 说明 |
|------|------|------|------|
| 包管理 (Node) | pnpm | npm | pnpm 速度快，磁盘占用少 |
| 包管理 (Python) | uv | pip + venv | uv 速度更快 |
| 容器 | Docker | — | 生产部署标准化 |
| CI/CD | GitHub Actions | — | 与 GitHub 深度集成 |
| 部署 | Vercel | Docker + VPS | 前端/全栈用 Vercel，自定义需求用 VPS |
| 代码检查 | ESLint + Prettier | Biome | ESLint 生态更成熟 |
| Python 检查 | Ruff | flake8 + black | Ruff 速度快，集 lint + format |

## 选型决策流程

引入新依赖前回答以下问题：

1. **是否必要**：能否用已有依赖或原生 API 解决？
2. **维护状态**：最近一次发布在 6 个月以内？Star/下载量趋势？
3. **包体积**：对 bundle size 影响是否可接受？
4. **类型支持**：是否有完善的 TypeScript 类型？
5. **团队熟悉度**：学习成本是否值得引入？

优先选择：活跃维护 > 社区广泛使用 > TypeScript 原生 > 轻量级
