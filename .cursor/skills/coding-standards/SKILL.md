---
name: coding-standards
description: >-
  定义 TypeScript/JavaScript 和 Python 的编码风格、命名约定、错误处理模式。
  编写或审查代码时使用，确保全项目代码风格一致。
disable-model-invocation: false
---

# 编码规范

## TypeScript / JavaScript

### 基本风格

- 使用 `const` 声明变量，仅在需要重新赋值时使用 `let`，禁止 `var`
- 优先使用箭头函数，组件和需要具名调用栈的场景使用 `function` 声明
- 使用 `async/await` 处理异步，避免 `.then()` 链
- 字符串使用单引号，模板字符串使用反引号
- 语句末尾使用分号
- 缩进使用 2 空格

### 命名约定

| 元素 | 风格 | 示例 |
|------|------|------|
| 变量 / 函数 | `camelCase` | `getUserName`、`isActive` |
| 常量 | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT`、`API_BASE_URL` |
| 类 / 接口 / 类型 | `PascalCase` | `UserProfile`、`ChatMessage` |
| 枚举值 | `PascalCase` | `MessageType.Text` |
| React 组件 | `PascalCase` | `ChatWindow`、`UserAvatar` |
| Hook | `use` 前缀 + `camelCase` | `useChat`、`useLocalStorage` |
| 布尔值 | `is/has/can/should` 前缀 | `isLoading`、`hasPermission` |
| 事件处理 | `handle` 前缀 | `handleSubmit`、`handleClick` |
| 回调 prop | `on` 前缀 | `onClose`、`onChange` |

### 类型使用

- 优先使用 `interface` 定义对象形状，`type` 用于联合类型和工具类型
- 导出所有公共类型，配合模块使用
- 避免 `any`，必要时使用 `unknown` 并做类型收窄
- 使用 Zod 进行运行时校验与类型推导结合

```typescript
// 优先 interface 定义数据结构
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

// type 用于联合类型和工具类型
type MessageRole = ChatMessage['role'];
type Optional<T> = T | undefined;
```

### 函数设计

- 函数参数超过 3 个时使用对象参数并解构
- 纯函数优先，副作用隔离
- 提前返回减少嵌套（Guard Clause 模式）

```typescript
// Guard Clause 模式
function processMessage(msg: ChatMessage) {
  if (!msg.content.trim()) return null;
  if (msg.role === 'system') return handleSystemMessage(msg);

  return formatUserMessage(msg);
}

// 对象参数解构
function createEmbedding({
  text,
  model = 'text-embedding-3-small',
  dimensions = 1536,
}: CreateEmbeddingOptions) {
  // ...
}
```

### Import 排序

按以下顺序组织，各组之间空一行：

1. Node.js 内置模块
2. 第三方库
3. 项目内部模块（`@/` 别名）
4. 相对路径导入
5. 类型导入（`import type`）

## Python

### 基本风格

- 遵循 PEP 8 基础规范
- 缩进使用 4 空格
- 所有函数和方法添加类型注解
- 使用 `"""` 三引号 docstring（Google 风格）
- 使用 f-string 格式化字符串
- 使用 `pathlib.Path` 替代 `os.path`

### 命名约定

| 元素 | 风格 | 示例 |
|------|------|------|
| 变量 / 函数 | `snake_case` | `get_user_name` |
| 常量 | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| 类 | `PascalCase` | `VectorStore` |
| 私有成员 | `_` 前缀 | `_internal_cache` |
| 模块 | `snake_case` | `vector_store.py` |

### 类型注解

```python
from typing import Optional

def search_documents(
    query: str,
    top_k: int = 5,
    threshold: float = 0.7,
) -> list[dict[str, any]]:
    """检索相关文档。

    Args:
        query: 搜索查询文本。
        top_k: 返回结果数量上限。
        threshold: 相似度阈值。

    Returns:
        匹配的文档列表。
    """
    ...
```

## 错误处理

### TypeScript

- 使用自定义错误类区分错误类型
- API 层统一错误格式返回
- 异步操作必须有 try/catch 或 `.catch()`

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 统一错误响应格式
interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
```

### Python

- 使用自定义异常类
- 避免裸 `except`，明确捕获异常类型
- 使用 `logging` 模块记录错误

```python
class ServiceError(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR"):
        super().__init__(message)
        self.code = code
```

## 通用原则

1. **DRY**：逻辑重复 2 次以上提取为函数/模块
2. **KISS**：优先选择简单直接的实现
3. **显式优于隐式**：配置、类型、依赖关系都应明确声明
4. **不可变优先**：优先使用不可变数据结构，减少意外副作用
5. **关注点分离**：UI / 业务逻辑 / 数据访问 各层职责清晰
