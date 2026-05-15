# 异步任务与队列

## 为什么需要异步

LLM 调用慢（通常 1-30 秒），而且有些任务更慢：

| 任务类型 | 耗时 | 是否需要用户等待 |
|---------|------|----------------|
| 简单问答 | 1-3s | 是（可以等） |
| RAG 检索+生成 | 3-10s | 是（勉强能等） |
| 长文档总结 | 10-60s | 不应该等 |
| 批量数据处理 | 几分钟-几小时 | 绝对不等 |
| Agent 多步任务 | 不确定 | 最好异步 |

超过 10 秒的任务，应该**异步处理**——立即返回"任务已提交"，处理完了再通知用户。

## 同步 vs 异步

```
同步（当前做法）：
  用户发消息 → 等待 LLM → 等待 → 等待 → 返回结果
  用户体验：卡住了，不知道在干嘛

异步：
  用户发消息 → 立即返回 "处理中..."
  后台：调 LLM → 生成结果
  完成后：主动通知用户 "这是你的结果"
```

## 实现方式

### 方式 1：简单内存队列（小规模）

```typescript
interface Task {
  id: string;
  userId: string;
  query: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: string;
}

const taskQueue: Task[] = [];

async function submitTask(userId: string, query: string): string {
  const task: Task = { id: crypto.randomUUID(), userId, query, status: 'pending' };
  taskQueue.push(task);
  processQueue();  // 不 await，后台处理
  return task.id;
}

async function processQueue() {
  const task = taskQueue.find(t => t.status === 'pending');
  if (!task) return;

  task.status = 'processing';
  try {
    task.result = await callLLM(task.query);
    task.status = 'done';
    notifyUser(task.userId, task.result);  // 处理完主动通知
  } catch (err) {
    task.status = 'error';
  }
}
```

### 方式 2：消息队列（生产级）

用 Redis Queue / BullMQ / RabbitMQ 等：

```
Producer（接入层）→ 消息队列 → Consumer（处理 Worker）
                                    ↓
                              LLM 调用 + 结果回写
```

优点：
- Worker 可以水平扩展（多个实例消费）
- 任务持久化（重启不丢失）
- 失败自动重试
- 可设优先级

### 方式 3：Batch API（模型厂商提供）

OpenAI 提供 Batch API，适合大批量非实时任务：

```
提交 1000 个请求 → OpenAI 异步处理 → 全部完成后回调
费用：正常价格的 50%
延迟：最长 24 小时
```

## 在 QQ Bot 中的应用

你的 QQ Bot 当前是同步处理——用户发消息后要等 LLM 回复。对于复杂问题可以改成异步：

```typescript
async function handleMessage(event: OneBotEvent) {
  const text = extractText(event);
  
  if (text.length > 500 || text.includes('总结') || text.includes('分析')) {
    // 长任务：异步处理
    sendGroupMessage(groupId, '收到，正在处理中...');
    const reply = await chat(userId, text);  // 后台执行
    sendGroupMessage(groupId, reply);        // 完成后发送
  } else {
    // 短任务：同步处理
    const reply = await chat(userId, text);
    sendGroupMessage(groupId, reply);
  }
}
```

实际上 QQ Bot 本身就是天然异步的——WebSocket 收到消息后处理，完成后发回去，用户不需要"盯着等"。

## 并发控制

异步后要注意并发：

```typescript
// 限制同时只有 N 个 LLM 调用
const MAX_CONCURRENT = 3;
let activeCalls = 0;

async function rateLimitedChat(query: string): Promise<string> {
  while (activeCalls >= MAX_CONCURRENT) {
    await new Promise(r => setTimeout(r, 100));
  }
  activeCalls++;
  try {
    return await callLLM(query);
  } finally {
    activeCalls--;
  }
}
```

防止 QQ 群里 20 个人同时问问题，瞬间发 20 个 API 请求。

## 核心总结

| 场景 | 策略 |
|------|------|
| 短任务 (< 5s) | 同步，用户等待 |
| 中任务 (5-30s) | 同步 + 流式输出，让用户看到进度 |
| 长任务 (> 30s) | 异步，完成后通知 |
| 批量任务 | 消息队列 / Batch API |
