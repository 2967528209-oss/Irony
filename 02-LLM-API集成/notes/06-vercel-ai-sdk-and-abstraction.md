# Vercel AI SDK 与多模型统一抽象层

## 为什么需要统一抽象层

直接使用各家 SDK 的问题：

```
应用代码
├── import OpenAI from 'openai'        → OpenAI 专属语法
├── import Anthropic from '@anthropic'  → Anthropic 专属语法
├── import { Ollama } from 'ollama'     → Ollama 专属语法
└── 每切换一个模型，改一堆代码
```

理想状态：

```
应用代码
└── import { generateText } from 'ai'  → 统一接口
    ├── 配置 provider: openai / anthropic / deepseek
    └── 业务代码零修改
```

## Vercel AI SDK 架构

Vercel AI SDK 就是上面「理想状态」的实现。它分为三层：

```
┌─────────────────────────────────┐
│          应用层 (你的代码)         │
│  generateText / streamText      │
│  useChat / useCompletion        │
├─────────────────────────────────┤
│         AI SDK Core             │  ← 统一接口层
│  模型无关的 API 抽象              │
├─────────────────────────────────┤
│        Provider 层              │  ← 适配器层
│  @ai-sdk/openai                 │
│  @ai-sdk/anthropic              │
│  @ai-sdk/google                 │
│  (openai-compatible 适配器)      │  ← DeepSeek 用这个
└─────────────────────────────────┘
```

### 核心 API

| API | 用途 | 返回 |
|-----|------|------|
| `generateText()` | 非流式文本生成 | 完整文本 |
| `streamText()` | 流式文本生成 | ReadableStream |
| `generateObject()` | 结构化输出（JSON） | 类型安全的对象 |
| `streamObject()` | 流式结构化输出 | 逐步构建的对象 |

### React Hooks（前端）

| Hook | 用途 |
|------|------|
| `useChat()` | 完整的多轮对话 UI 状态管理 |
| `useCompletion()` | 单次补全 |
| `useObject()` | 流式结构化数据 |

`useChat` 自动处理了：消息数组管理、流式渲染、加载状态、中断取消、错误处理。相当于我们前面 5 个练习的功能，一个 Hook 全包了。

## DeepSeek 接入方式

DeepSeek 兼容 OpenAI 格式，通过 `@ai-sdk/openai` 的 `createOpenAI` 配置自定义 baseURL：

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const { text } = await generateText({
  model: deepseek('deepseek-chat'),
  prompt: '什么是 RAG？',
});
```

## 多模型切换的架构设计

### 方案 1：配置驱动（推荐）

```typescript
const providers = {
  deepseek: createOpenAI({
    apiKey: env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
  }),
  openai: createOpenAI({
    apiKey: env.OPENAI_API_KEY,
  }),
};

const modelRegistry = {
  'fast': providers.deepseek('deepseek-chat'),
  'smart': providers.deepseek('deepseek-v4-pro'),
  'gpt4': providers.openai('gpt-4o'),
};

// 业务代码只需指定语义化的模型名
const { text } = await generateText({
  model: modelRegistry['fast'],
  prompt: '...',
});
```

### 方案 2：模型路由器

根据任务复杂度自动选择模型：

```
用户请求 → [路由器] → 简单任务 → fast 模型（成本低）
                   → 复杂任务 → smart 模型（质量高）
                   → 代码任务 → code 模型（专精）
```

路由判断依据：
- Prompt 长度
- 任务类型关键词
- 用户等级/预算
- 历史调用成功率

## 全栈数据流

一个完整的 AI 对话应用的数据流：

```
前端（React）                     后端（API Route）                LLM Provider
┌──────────┐                   ┌──────────────┐              ┌───────────┐
│ useChat() │ ── POST /api ──→ │ streamText() │ ── HTTPS ──→ │ DeepSeek  │
│           │ ←─ SSE stream ── │              │ ←─ SSE ──── │           │
│ 自动渲染   │                   │ 错误重试      │              │           │
│ 消息列表   │                   │ Token 统计   │              │           │
└──────────┘                   └──────────────┘              └───────────┘
```

前端零感知后端用的是哪个 LLM，后端可以随时切换 Provider。

## Vercel AI SDK 的价值

| 不用 SDK | 用 SDK |
|----------|--------|
| 自己处理 SSE 解析 | SDK 封装好了 |
| 自己管理 messages 数组 | useChat 自动管理 |
| 自己写中断逻辑 | stop() 一键停止 |
| 每个 Provider 写适配代码 | Provider 层统一适配 |
| 自己做结构化输出解析 | generateObject + Zod schema |

它不是必需品，但在全栈 AI 应用开发中能省大量重复工作。

## 参考资源

- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)
- [AI SDK Provider 列表](https://sdk.vercel.ai/providers/ai-sdk-providers)
