# Function Calling 机制

## 核心概念

LLM 本身只能输出文本。Function Calling 让 LLM 具备了「调用外部工具」的能力：

```
传统 LLM：
  用户: "北京今天天气怎么样？"
  LLM:  "我无法获取实时天气信息。"  ← 只能说不知道

Function Calling：
  用户: "北京今天天气怎么样？"
  LLM:  → 我需要调用 get_weather(city="北京")  ← 决定调用哪个工具
  代码: → 执行 get_weather → {"temp": 28, "weather": "晴"}
  LLM:  "北京今天 28°C，晴天。"  ← 基于工具结果生成回答
```

关键理解：**LLM 不执行工具**，它只是决定「该调哪个工具、传什么参数」。实际执行由你的代码完成。

## 两轮调用流程

```
    你的代码                        LLM API
       │                              │
  1.   │── 发送消息 + 工具定义列表 ──→  │
       │                              │ LLM 判断是否需要工具
  2.   │←── 返回 tool_calls ─────────  │  (不是文本，是函数名+参数)
       │                              │
  3.   │ 你的代码执行函数，获取结果      │
       │                              │
  4.   │── 发送工具执行结果 ──────────→  │
       │                              │ LLM 基于结果生成回答
  5.   │←── 返回最终文本回答 ─────────  │
```

这是**两轮 API 调用**，不是一轮。第 1-2 步是让 LLM 决策，第 4-5 步是让 LLM 基于结果生成。

## OpenAI / DeepSeek 的实现

### 工具定义（JSON Schema）

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取指定城市的当前天气信息',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称，如 "北京"、"上海"',
          },
        },
        required: ['city'],
      },
    },
  },
];
```

LLM 根据 `description` 判断什么时候该用这个工具，根据 `parameters` 知道该传什么参数。

### LLM 返回的 tool_calls

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "get_weather",
          "arguments": "{\"city\": \"北京\"}"
        }
      }]
    },
    "finish_reason": "tool_calls"
  }]
}
```

注意：`content` 为 null，`finish_reason` 是 `tool_calls` 而非 `stop`。

### 回传工具结果

```typescript
messages.push({
  role: 'tool',
  tool_call_id: 'call_abc123',  // 对应 tool_calls 中的 id
  content: JSON.stringify({ temp: 28, weather: '晴' }),
});
```

## Anthropic / Claude 的差异

| 维度 | OpenAI / DeepSeek | Anthropic / Claude |
|------|-------------------|-------------------|
| 工具参数字段 | `function.parameters` | `input_schema` |
| 返回格式 | `tool_calls` 数组 | `content` 中的 `tool_use` block |
| 工具结果角色 | `role: 'tool'` | `role: 'user'` + `tool_result` block |
| 强制调用 | `tool_choice: { type: 'function', function: { name: 'xxx' } }` | `tool_choice: { type: 'tool', name: 'xxx' }` |

核心流程一致，只是 JSON 结构有差异。

## 与阶段 2 实践的关联

阶段 2 的 `03-function-calling.ts` 已经实现了单次 Function Calling（天气工具 demo）。阶段 4 的重点是从**单次调用**升级到**循环调用**——即 Agent。

```
单次调用（Function Calling）：
  用户 → LLM → 调用 1 个工具 → 结果 → 回答 → 结束

循环调用（Agent）：
  用户 → LLM → 工具 A → 结果 → LLM → 工具 B → 结果 → LLM → 回答
```

下一个知识点将讲 Tool 定义的设计原则，然后进入 Agent 循环。
