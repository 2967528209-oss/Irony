---
name: api-design
description: >-
  定义 REST API 设计规范，包括 URL 命名、HTTP 方法、状态码、请求响应格式、分页与版本化。
  设计新 API 端点、编写路由处理、定义接口契约时使用。
disable-model-invocation: false
---

# API 设计规范

## URL 设计

### 命名规则

- 使用 `kebab-case`，全小写
- 名词复数表示资源集合，单数表示单一资源操作
- 嵌套资源不超过 2 层

```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

GET    /api/users/:id/messages        ✅ 一层嵌套
GET    /api/users/:id/messages/:mid   ✅ 两层嵌套
GET    /api/users/:id/messages/:mid/attachments/:aid   ❌ 太深，扁平化
→ GET /api/attachments/:aid
```

### 路径前缀

| 类型 | 前缀 | 示例 |
|------|------|------|
| 公开 API | `/api/` | `/api/chat` |
| 管理后台 | `/api/admin/` | `/api/admin/users` |
| Webhook | `/api/webhooks/` | `/api/webhooks/stripe` |
| 健康检查 | `/api/health` | — |

## HTTP 方法语义

| 方法 | 语义 | 幂等 | 示例 |
|------|------|------|------|
| `GET` | 查询，无副作用 | 是 | 获取用户列表 |
| `POST` | 创建资源 / 触发操作 | 否 | 创建对话、发送消息 |
| `PUT` | 整体替换 | 是 | 替换用户资料 |
| `PATCH` | 部分更新 | 是 | 修改用户昵称 |
| `DELETE` | 删除资源 | 是 | 删除对话 |

## 状态码使用

### 成功

| 状态码 | 使用场景 |
|--------|----------|
| `200` | 通用成功（GET / PATCH / DELETE） |
| `201` | 资源创建成功（POST） |
| `204` | 成功但无返回体（DELETE） |

### 客户端错误

| 状态码 | 使用场景 |
|--------|----------|
| `400` | 请求参数校验失败 |
| `401` | 未认证（缺少或无效 Token） |
| `403` | 已认证但无权限 |
| `404` | 资源不存在 |
| `409` | 资源冲突（如重复创建） |
| `422` | 请求格式正确但语义错误 |
| `429` | 请求频率超限 |

### 服务端错误

| 状态码 | 使用场景 |
|--------|----------|
| `500` | 服务器内部错误 |
| `502` | 上游服务不可用（如 LLM API 故障） |
| `503` | 服务暂时不可用 |

## 请求与响应格式

### 统一响应结构

```typescript
// 成功响应
interface SuccessResponse<T> {
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

// 错误响应
interface ErrorResponse {
  error: {
    code: string;       // 机器可读错误码: "VALIDATION_ERROR"
    message: string;    // 人类可读描述
    details?: unknown;  // 可选：字段级错误详情
  };
}
```

### 请求校验

使用 Zod 在路由入口处校验：

```typescript
const createChatSchema = z.object({
  messages: z.array(messageSchema).min(1),
  model: z.string().optional().default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).optional(),
});
```

## 分页

### 偏移量分页（简单场景）

```
GET /api/messages?page=2&pageSize=20

Response:
{
  "data": [...],
  "meta": { "page": 2, "pageSize": 20, "total": 156 }
}
```

### 游标分页（大数据集 / 实时数据）

```
GET /api/messages?cursor=abc123&limit=20

Response:
{
  "data": [...],
  "meta": { "nextCursor": "def456", "hasMore": true }
}
```

## 过滤与排序

```
GET /api/messages?role=user&sort=-createdAt&search=hello
```

- 过滤：字段名作为 query 参数
- 排序：`sort` 参数，`-` 前缀表示降序
- 搜索：`search` 参数做全文/模糊搜索

## 流式 API（AI 场景）

AI 对话等流式场景使用 SSE：

```
POST /api/chat   (Content-Type: application/json)
Response: text/event-stream

data: {"type":"text_delta","content":"Hello"}
data: {"type":"text_delta","content":" world"}
data: {"type":"done","usage":{"promptTokens":10,"completionTokens":5}}
```

## API 版本化

- 早期不加版本号，保持简洁
- 出现不兼容变更时引入 URL 前缀版本：`/api/v2/`
- 旧版本设置日落期，响应头添加 `Sunset` 和 `Deprecation`
