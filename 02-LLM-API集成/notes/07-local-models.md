# 本地模型部署与调用

## 为什么需要本地模型

| 场景 | 本地模型的价值 |
|------|--------------|
| 数据隐私 | 敏感数据不出网络 |
| 离线开发 | 无网络环境也能开发调试 |
| 成本控制 | 大量调用时无 API 费用 |
| 低延迟 | 局域网内毫秒级响应 |
| 降级兜底 | 云 API 故障时的备用方案 |

## Ollama：最简单的本地部署方案

### 架构

```
你的应用 ── HTTP ──→ Ollama Server (localhost:11434) ── 推理 ──→ 本地 GPU/CPU
```

Ollama 在本地启动一个 HTTP Server，暴露兼容 OpenAI 格式的 API。

### 安装与使用

```bash
# macOS
brew install ollama

# 启动服务
ollama serve

# 拉取模型
ollama pull qwen2.5:7b        # 通义千问 7B
ollama pull deepseek-r1:8b    # DeepSeek R1 蒸馏版
ollama pull nomic-embed-text  # Embedding 模型

# 对话测试
ollama run qwen2.5:7b "什么是 RAG？"
```

### 代码接入

Ollama 兼容 OpenAI API 格式，用 `openai` SDK 直接连：

```typescript
const client = new OpenAI({
  apiKey: 'ollama',                      // Ollama 不需要真实 key
  baseURL: 'http://localhost:11434/v1',   // 本地端口
});

const completion = await client.chat.completions.create({
  model: 'qwen2.5:7b',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

Vercel AI SDK 接入：

```typescript
const ollama = createOpenAI({
  apiKey: 'ollama',
  baseURL: 'http://localhost:11434/v1',
});

const { text } = await generateText({
  model: ollama('qwen2.5:7b'),
  prompt: 'Hello',
});
```

## 模型选择指南

| 模型 | 参数量 | 内存需求 | 适用 |
|------|--------|---------|------|
| qwen2.5:3b | 3B | ~4 GB | 简单任务、快速测试 |
| qwen2.5:7b | 7B | ~8 GB | 通用对话、代码 |
| deepseek-r1:8b | 8B | ~8 GB | 推理任务 |
| llama3.1:8b | 8B | ~8 GB | 英文场景 |

**经验法则**：模型参数量（B）× 1.2 ≈ 所需内存（GB）

## 在架构中的定位

```
┌─────── 模型路由器 ───────┐
│                          │
│  云端 API（首选）         │ ← 质量最高、延迟可接受
│  ├── DeepSeek V4 Pro     │
│  └── OpenAI GPT-4o       │
│                          │
│  本地模型（降级/特殊场景） │ ← 隐私、离线、成本
│  ├── Ollama + Qwen 7B    │
│  └── Ollama + Embedding  │
│                          │
└──────────────────────────┘
```

## 参考资源

- [Ollama 官网](https://ollama.com)
- [Ollama 模型库](https://ollama.com/library)
