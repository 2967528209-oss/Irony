---
name: database-modeling
description: >-
  定义数据库表/字段命名、关系设计、索引策略与 Migration 管理规范。
  设计数据库 Schema、编写 Migration、创建数据模型时使用。
disable-model-invocation: false
---

# 数据库建模规范

## 表命名

- 使用 `snake_case`，复数形式
- 关联表使用两表名拼接：`user_roles`、`document_tags`

| 类型 | 格式 | 示例 |
|------|------|------|
| 业务表 | 复数名词 | `users`、`conversations`、`messages` |
| 关联表 | `表A_表B` | `user_roles`、`document_tags` |
| 配置表 | `单数_configs` | `app_configs` |

## 字段命名

### 通用规则

- 使用 `snake_case`
- 主键统一使用 `id`
- 外键使用 `关联表单数_id`：`user_id`、`conversation_id`
- 布尔值使用 `is_/has_` 前缀：`is_active`、`has_attachment`
- 时间戳使用 `_at` 后缀：`created_at`、`updated_at`、`deleted_at`

### 必备字段

每张业务表都应包含：

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

需要软删除的表添加：

```sql
deleted_at  TIMESTAMPTZ
```

### 字段类型选择

| 数据 | 类型 | 说明 |
|------|------|------|
| 主键 | `UUID` | 分布式友好，默认选择 |
| 短文本 | `VARCHAR(n)` | 明确长度限制 |
| 长文本 | `TEXT` | 无长度限制 |
| 时间 | `TIMESTAMPTZ` | 始终带时区 |
| 金额 | `NUMERIC(precision, scale)` | 避免浮点精度问题 |
| JSON 数据 | `JSONB` | 非结构化数据，可索引 |
| 枚举 | `VARCHAR` + 应用层校验 | 避免 PG 原生 ENUM 的迁移困难 |
| 向量 | `vector(dimensions)` | pgvector 扩展 |

## 关系设计

### 关系模式

```
一对一：users ←→ user_profiles       (profile.user_id UNIQUE)
一对多：users ←→ conversations       (conversation.user_id)
多对多：documents ←→ tags            (document_tags 关联表)
```

### 外键约束

```sql
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
```

- `ON DELETE CASCADE`：父记录删除时级联删除（如用户→对话）
- `ON DELETE SET NULL`：父记录删除时置空（如分类→文章）
- `ON DELETE RESTRICT`：禁止删除被引用的父记录

## 索引策略

### 必建索引

1. 外键字段
2. 频繁查询的 WHERE 条件字段
3. 排序字段（`created_at`、`updated_at`）
4. 唯一约束字段

### 索引命名

`idx_表名_字段名`

```sql
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
```

### 避免过度索引

- 写多读少的表减少索引
- 低基数字段（如 `gender`）不单独建索引
- 复合索引遵循最左前缀原则

## Migration 管理

### 命名规则

`YYYYMMDDHHMMSS_动作_描述`

```
20260512140000_create_users.sql
20260512140100_create_conversations.sql
20260512150000_add_messages_embedding_column.sql
```

### Migration 原则

1. **只追加不修改**：已执行的 Migration 文件禁止修改
2. **可回滚**：每个 up 有对应的 down
3. **原子性**：一个 Migration 完成一个完整的 Schema 变更
4. **数据安全**：涉及数据变更的 Migration 先备份
5. **向后兼容**：先添加新字段 → 迁移数据 → 再删除旧字段

### Drizzle ORM Schema 示例

```typescript
import { pgTable, uuid, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

## Seed 数据

- 开发环境 Seed 与 Migration 分离，放在 `scripts/seed.ts`
- 使用工厂函数生成测试数据
- Seed 脚本幂等：可重复运行不会重复插入
