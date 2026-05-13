# Tool 定义与 Schema 设计

## 为什么 Tool 定义重要

LLM 选择工具的唯一依据是你提供的 `description` 和 `parameters`。工具定义写得好不好，直接决定了 LLM 能不能在正确的时机选对正确的工具。

```
差的定义：
  name: "search"
  description: "搜索功能"
  → LLM：什么时候该用？搜什么？不清楚

好的定义：
  name: "search_documents"
  description: "在知识库中搜索文档。当用户提出需要查阅资料才能回答的事实性问题时使用。"
  → LLM：明确知道什么场景该调、搜的是什么
```

## description 的写法原则

**写「什么时候用」而不是「怎么用」**：

| 差 | 好 |
|----|----|
| "调用天气 API" | "获取指定城市的实时天气。当用户询问天气相关问题时使用" |
| "执行数据库查询" | "查询用户订单数据。当需要查看订单状态、历史记录时使用" |
| "搜索函数" | "在代码仓库中搜索函数定义。当需要理解某个函数的实现时使用" |

## parameters 设计要点

```typescript
parameters: {
  type: 'object',
  properties: {
    // 1. 命名语义化
    query: { type: 'string', description: '搜索关键词' },    // ✅
    q:     { type: 'string', description: '搜索关键词' },    // ❌ LLM 不理解 q

    // 2. 用 enum 约束选项
    sort_by: {
      type: 'string',
      enum: ['relevance', 'date', 'popularity'],             // ✅ 限制选择
      description: '排序方式',
    },

    // 3. 用 default + minimum/maximum 约束范围
    max_results: {
      type: 'integer',
      default: 5,
      minimum: 1,
      maximum: 20,                                            // ✅ 防止离谱值
    },
  },
  required: ['query'],  // 4. 明确必填
}
```

## 工具数量的权衡

LLM 需要从你提供的工具列表中选择。工具越多，选择越难：

| 工具数 | 效果 | 策略 |
|--------|------|------|
| 1-5 个 | 选择准确率高 | 直接用 |
| 5-15 个 | 需要精确的 description | 每个工具描述要有区分度 |
| 15+ 个 | 效果明显下降 | 分组：先选类别再选工具 |

工具太多时的解决方案——**两级路由**：

```
用户问题
  ↓
第 1 级 LLM：选类别
  ├── "文件操作" → [read_file, write_file, list_dir]
  ├── "数据查询" → [query_db, get_user, get_order]
  └── "外部服务" → [send_email, search_web, get_weather]
  ↓
第 2 级 LLM：在类别内选具体工具
```

## 参数校验

LLM 生成的参数不总是对的。执行前必须校验：

```typescript
function safeExecute(toolCall: ToolCall) {
  const args = JSON.parse(toolCall.function.arguments);

  // 校验必填
  if (!args.query) return { error: '缺少参数: query' };

  // 修正越界值
  if (args.max_results > 20) args.max_results = 20;

  // 执行
  return executeSearch(args);
}
```

重要：**错误时返回错误信息，不要抛异常**。让 LLM 知道出了什么问题，它可能会调整参数重试。

## 常见设计模式

| 模式 | 示例 | 适用场景 |
|------|------|---------|
| CRUD 套件 | create/get/update/delete/list | 数据管理 |
| 搜索+操作 | search → execute | 先查再做 |
| 读写分离 | get_xxx / update_xxx | 读操作安全，写操作需确认 |
