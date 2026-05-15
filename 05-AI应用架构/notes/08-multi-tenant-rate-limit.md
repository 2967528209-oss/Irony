# 多租户隔离与限流

## 什么是多租户

多租户 = **多个用户/组织共享同一套系统，但数据和资源互相隔离**。

```
你的 QQ Bot 就是一个多租户场景：
  用户 A 的对话历史 ≠ 用户 B 的对话历史
  群 1 的使用额度 ≠ 群 2 的使用额度
```

SaaS 产品（如提供 AI 能力的平台）更典型：
```
企业 A：自己的 Prompt、自己的知识库、自己的用量
企业 B：完全独立
→ 但底层用的是同一个系统
```

## 需要隔离什么

| 维度 | 隔离内容 | 风险 |
|------|---------|------|
| **数据** | 对话历史、知识库 | 用户 A 看到用户 B 的数据 |
| **配额** | Token 额度、API 次数 | 一个用户耗尽所有人的额度 |
| **配置** | Prompt、模型选择 | 一个用户的配置影响其他人 |
| **性能** | 请求处理速度 | 一个用户的大量请求拖慢其他人 |

## 数据隔离

最基本的：**每个操作都带上用户/租户 ID**。

```typescript
// 我们 QQ Bot 已经做了（按 userId 隔离对话历史）
const userHistories = new Map<string, ChatCompletionMessageParam[]>();

function getHistory(userId: string) {
  if (!userHistories.has(userId)) {
    userHistories.set(userId, []);
  }
  return userHistories.get(userId)!;
}
```

生产环境用数据库时，每张表都带 `tenant_id` 字段：

```sql
SELECT * FROM chat_history
  WHERE tenant_id = 'company_a' AND user_id = 'user_123';
```

## 限流（Rate Limiting）

防止单个用户/租户耗尽资源。

### 滑动窗口限流

```typescript
const requestLog = new Map<string, number[]>();

function isRateLimited(userId: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(userId) || [];
  
  // 只保留窗口内的请求
  const recent = timestamps.filter(t => now - t < windowMs);
  
  if (recent.length >= maxRequests) return true;
  
  recent.push(now);
  requestLog.set(userId, recent);
  return false;
}

// 使用：每用户每分钟最多 10 次
if (isRateLimited(userId, 10, 60_000)) {
  sendGroupMessage(groupId, '请求太频繁，请稍后再试~');
  return;
}
```

### 分层限流

不同层级不同限制：

```
全局限流：所有用户合计每分钟 100 次（保护 API Key 额度）
用户限流：每个用户每分钟 10 次
群限流：  每个群每分钟 30 次
```

```typescript
interface RateLimiter {
  global:  { max: 100, window: 60_000 };
  perUser: { max: 10,  window: 60_000 };
  perGroup:{ max: 30,  window: 60_000 };
}
```

## Token 配额管理

限流控制的是**请求频率**，配额控制的是**总消耗量**：

```typescript
interface UserQuota {
  dailyTokenLimit: number;   // 每天 Token 上限
  tokensUsedToday: number;   // 今天已用
  lastResetDate: string;     // 上次重置日期
}

function checkQuota(userId: string, estimatedTokens: number): boolean {
  const quota = getQuota(userId);
  
  // 自动重置每日额度
  const today = new Date().toISOString().slice(0, 10);
  if (quota.lastResetDate !== today) {
    quota.tokensUsedToday = 0;
    quota.lastResetDate = today;
  }
  
  return quota.tokensUsedToday + estimatedTokens <= quota.dailyTokenLimit;
}
```

## 在 QQ Bot 中的实际应用

当前 QQ Bot 没有任何限流。群里公开使用需要加：

```typescript
async function handleMessage(event: OneBotEvent) {
  const userId = String(event.user_id);
  const groupId = event.group_id;

  // 1. 频率限流
  if (isRateLimited(userId, 10, 60_000)) {
    sendGroupMessage(groupId!, '你问得太快了，歇会儿~');
    return;
  }

  // 2. 配额检查
  if (!checkQuota(userId, 2000)) {
    sendGroupMessage(groupId!, '今日额度已用完~');
    return;
  }

  // 3. 正常处理
  const reply = await chat(userId, text);
  sendGroupMessage(groupId!, reply);
}
```

## 核心总结

| 机制 | 保护什么 | 粒度 |
|------|---------|------|
| 数据隔离 | 用户隐私 | 每个请求必带租户 ID |
| 频率限流 | 系统稳定性 | 全局 / 用户 / 群 |
| Token 配额 | 成本控制 | 每用户每日上限 |
