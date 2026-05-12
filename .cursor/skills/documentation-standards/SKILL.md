---
name: documentation-standards
description: >-
  定义代码注释、README、API 文档、学习笔记和架构文档的编写规范。
  编写文档、注释代码、创建 README 或记录学习笔记时使用。
disable-model-invocation: false
---

# 文档规范

## 代码注释

### 注释原则

- **只注释 Why，不注释 What**：代码本身应自解释做了什么
- **避免冗余注释**：不写 `// 遍历数组`、`// 返回结果` 这类注释
- **保持同步**：修改代码时同步更新相关注释
- **用代码消除注释**：如果需要注释来解释，先考虑能否通过重命名/重构让代码自解释

### 合理的注释场景

```typescript
// 使用指数退避策略，避免 API 限流导致雪崩
const delay = Math.min(baseDelay * Math.pow(2, retryCount), MAX_DELAY);

// OpenAI API 对 embedding 请求有 8191 token 的硬限制
const MAX_CHUNK_TOKENS = 8000;

// 临时方案：等上游 SDK 修复 #1234 后移除
const result = workaroundForBug(input);
```

### JSDoc / Docstring

公共 API 和导出函数添加文档注释：

```typescript
/**
 * 将文本分割为适合 embedding 的块。
 *
 * @param text - 原始文本内容
 * @param options - 分块配置
 * @returns 分块后的文本数组
 */
function splitIntoChunks(text: string, options?: ChunkOptions): string[] {
  // ...
}
```

```python
def create_embedding(
    text: str,
    model: str = "text-embedding-3-small",
) -> list[float]:
    """生成文本的向量表示。

    Args:
        text: 待编码的文本。
        model: embedding 模型名称。

    Returns:
        向量数组。

    Raises:
        EmbeddingError: 当 API 调用失败时。
    """
```

## README 规范

每个可独立运行的项目/模块都必须有 README.md：

```markdown
# 项目名称

一句话描述项目用途。

## 快速开始

### 环境要求
- Node.js >= 20
- pnpm >= 9

### 安装与运行
\`\`\`bash
pnpm install
pnpm dev
\`\`\`

### 环境变量
复制 `.env.example` 为 `.env.local` 并填入配置。

## 项目结构
[关键目录说明]

## 技术栈
[主要依赖及版本]

## 开发指南
[开发约定、测试方式、部署流程]
```

## API 文档

### REST API 文档格式

```markdown
### POST /api/chat

发送聊天消息并获取 AI 回复。

**请求体**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| messages | Message[] | 是 | 对话历史 |
| model | string | 否 | 模型名称，默认 gpt-4o-mini |

**响应**
- 200: 流式返回 AI 回复（SSE 格式）
- 400: 参数校验失败
- 429: 请求频率超限

**示例**
\`\`\`bash
curl -X POST /api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'
\`\`\`
```

## 学习笔记模板

阶段性学习产出使用以下模板：

```markdown
# [主题名称]

## 核心概念
- 概念 1：简要解释
- 概念 2：简要解释

## 关键实现
[代码片段 + 注解]

## 踩坑记录
| 问题 | 原因 | 解决方案 |
|------|------|----------|
| ... | ... | ... |

## 参考资源
- [资源名称](URL)
```

## 架构文档

系统级架构设计文档包含：

```markdown
# [系统名称] 架构设计

## 架构概览
[架构图 — 使用 Mermaid 或图片]

## 核心组件
| 组件 | 职责 | 技术选型 |
|------|------|----------|
| ... | ... | ... |

## 数据流
[描述核心数据如何在组件间流转]

## 关键决策
| 决策 | 选项 | 选择 | 原因 |
|------|------|------|------|
| ... | ... | ... | ... |

## 非功能需求
- 性能：[目标指标]
- 安全：[安全策略]
- 可观测：[监控方案]
```

## 文档语言

- 代码注释与 API 文档：英文
- 学习笔记与架构文档：中文
- Commit Message 与 PR 描述：英文
- README：项目面向中文用户用中文，否则用英文
