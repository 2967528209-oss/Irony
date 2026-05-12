# Streaming 处理深入

## 为什么需要 Streaming

一个典型的 LLM 请求耗时 5-30 秒。如果等全部生成完再显示，用户会面对一段漫长的空白等待。Streaming 让回复**边生成边显示**，首字延迟降到毫秒级。

```
非流式：[等待 10 秒...] → 一次性显示全部文本
流式：  [0.3s] H → [0.05s] e → [0.05s] l → l → o → ...（打字机效果）
```

## SSE（Server-Sent Events）原理

Streaming 底层使用 SSE 协议，它是 HTTP 的一种单向推流方式：

```
客户端 ──── POST /api/chat ──── → 服务器
客户端 ← ─ text/event-stream ── → 服务器

data: {"choices":[{"delta":{"content":"H"}}]}
data: {"choices":[{"delta":{"content":"e"}}]}
data: {"choices":[{"delta":{"content":"llo"}}]}
data: [DONE]
```

特点：
- 基于 HTTP，不需要 WebSocket
- 服务器单向推送
- 自动断线重连（浏览器原生支持）
- `Content-Type: text/event-stream`

## 后端：创建流式端点

```typescript
// Next.js API Route 示例
export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = await client.chat.completions.create({
    model: 'deepseek-v4-pro',
    messages,
    stream: true,
  });

  // 将 OpenAI SDK 的 stream 转为 Web ReadableStream
  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## 前端：消费流式响应

### 方式 1：ReadableStream + TextDecoder

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value, { stream: true });
  // 解析 SSE 格式
  const lines = text.split('\n').filter(line => line.startsWith('data: '));

  for (const line of lines) {
    const data = line.slice(6); // 去掉 "data: "
    if (data === '[DONE]') break;

    const { content } = JSON.parse(data);
    appendToUI(content); // 追加到界面
  }
}
```

### 方式 2：EventSource（仅 GET 请求）

```typescript
const source = new EventSource('/api/stream?q=hello');
source.onmessage = (event) => {
  if (event.data === '[DONE]') {
    source.close();
    return;
  }
  const { content } = JSON.parse(event.data);
  appendToUI(content);
};
```

注意：`EventSource` 只支持 GET，AI 对话场景通常用 POST，所以更常用方式 1。

## 中断能力

用户应该能随时取消正在生成的回复：

```typescript
const controller = new AbortController();

// 发起请求时传入 signal
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages }),
  signal: controller.signal,
});

// 用户点击"停止"时
function handleStop() {
  controller.abort();
}
```

## 动手练习

1. 修改 `02-stream-chat.ts`，添加中断能力（5 秒后自动中断）
2. 统计每个 chunk 的到达时间间隔，观察流式节奏

## 参考资源

- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [MDN: ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
