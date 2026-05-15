# Prompt 管理与版本控制

## 问题：Prompt 硬编码

我们之前写的代码全是这样：

```typescript
const SYSTEM_PROMPT = `你是一个拥有工具的 AI 助手...`;
```

小项目没问题。但 Prompt 一旦频繁修改、多人协作、需要对比效果，硬编码就扛不住了：

| 问题 | 场景 |
|------|------|
| 改了 Prompt 效果变差，想回滚 | 没有历史版本 |
| 想对比两个 Prompt 哪个好 | 没法 A/B 测试 |
| 多个环境用不同 Prompt | 开发/测试/生产混在一起 |
| 非技术人员想调 Prompt | 要改代码才行 |

## Prompt 当配置管理，不当代码管理

核心思路：**把 Prompt 从代码中抽出来，当成配置**。

```
硬编码（之前的做法）：
  代码里直接写 Prompt 字符串 → 改 Prompt 要改代码 → 要重新部署

配置化（生产做法）：
  Prompt 存在外部（文件/数据库）→ 改 Prompt 不用改代码 → 热更新
```

## 三种管理方式（从简单到复杂）

### 方式 1：文件管理（适合小团队）

```
prompts/
  ├── system-v1.txt        # 版本 1
  ├── system-v2.txt        # 版本 2（当前使用）
  └── system-v3-draft.txt  # 草稿
```

```typescript
import { readFileSync } from 'fs';

const version = process.env.PROMPT_VERSION || 'v2';
const systemPrompt = readFileSync(`prompts/system-${version}.txt`, 'utf-8');
```

优点：简单、Git 天然版本控制、diff 可读
缺点：切换版本要改环境变量/重启

### 方式 2：数据库管理（适合需要热更新）

```sql
CREATE TABLE prompts (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100),    -- 'qqbot-system'
  version    INT,             -- 1, 2, 3...
  content    TEXT,
  is_active  BOOLEAN,         -- 当前生效版本
  created_at TIMESTAMP
);
```

```typescript
async function getActivePrompt(name: string): Promise<string> {
  const row = await db.query(
    'SELECT content FROM prompts WHERE name = $1 AND is_active = true',
    [name]
  );
  return row.content;
}
```

优点：热切换、可回滚、非技术人员可通过后台修改
缺点：需要搭建管理后台

### 方式 3：专用平台（适合大团队）

| 平台 | 特点 |
|------|------|
| **Langfuse** | 开源，Prompt 管理 + 可观测性 |
| **PromptLayer** | Prompt 版本 + 评估 |
| **Humanloop** | Prompt 优化 + A/B 测试 |

这些平台本质上就是方式 2 的产品化封装。

## Prompt 模板化

实际的 Prompt 通常有**动态部分**，需要模板引擎：

```
静态 Prompt（我们之前的做法）：
  "你是一个 QQ 群助手"

模板化 Prompt：
  "你是 {{role}}，服务于 {{platform}}。
   用户昵称: {{username}}
   当前时间: {{now}}"
```

```typescript
function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

const prompt = renderPrompt(systemTemplate, {
  role: '技术助手',
  platform: 'QQ 群',
  username: senderName,
  now: new Date().toLocaleString('zh-CN'),
});
```

## 版本控制的关键字段

不管用哪种方式，每个 Prompt 版本应该记录：

| 字段 | 作用 |
|------|------|
| name | 标识（如 'qqbot-system'） |
| version | 版本号 |
| content | Prompt 内容 |
| description | 这个版本改了什么 |
| is_active | 是否正在使用 |
| created_at | 创建时间 |
| metrics | 效果指标（可选，A/B 测试用） |

## 与我们项目的关联

我们 QQ Bot 的 `BOT_SYSTEM_PROMPT` 已经用了环境变量，这是方式 1 的雏形：

```typescript
systemPrompt: process.env.BOT_SYSTEM_PROMPT ||
  '你是一个 QQ 群里的 AI 助手...',
```

下一步可以升级为文件管理，把不同场景的 Prompt 放在 `prompts/` 目录里。

## 实际建议

| 阶段 | 方式 |
|------|------|
| 个人项目 / 原型 | 环境变量 + 文件（当前做法） |
| 小团队生产 | 文件 + Git 版本控制 |
| 中大团队 | 数据库 + 管理后台 |
| 需要 A/B 测试 | 专用平台（Langfuse 等） |
