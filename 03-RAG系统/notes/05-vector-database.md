# 向量数据库

## 为什么需要专门的向量存储

传统数据库的 `WHERE name = 'xxx'` 是精确匹配。向量检索是「**找最像的**」——给一个向量，找出距离最近的 K 个向量。这需要专门的索引结构。

## 主流方案对比

| 方案 | 类型 | 特点 | 适用场景 |
|------|------|------|---------|
| **pgvector** | PG 扩展 | 与 PostgreSQL 统一，运维简单 | 中小规模（< 1000 万向量） |
| **Pinecone** | 托管 SaaS | 零运维，自动扩缩容 | 快速上线，不想管基础设施 |
| **Chroma** | 嵌入式 | 像 SQLite 一样嵌入应用 | 原型开发、本地测试 |
| **Weaviate** | 独立服务 | 支持混合检索、自带向量化 | 大规模生产 |
| **Milvus** | 独立服务 | 高性能、分布式 | 超大规模（亿级向量） |

## pgvector（推荐方案）

### 为什么推荐

```
传统方案：PostgreSQL（业务数据） + Pinecone（向量数据）= 两套系统
pgvector：PostgreSQL（业务 + 向量）= 一套系统
```

一套数据库同时存业务数据和向量数据，减少运维复杂度，支持事务一致性。

### 索引类型

| 索引 | 算法 | 特点 |
|------|------|------|
| IVFFlat | 倒排文件 + 平坦扫描 | 建索引快，查询时需设 probes |
| HNSW | 层次化可导航小世界图 | 查询快、精度高，建索引慢，占内存 |

**推荐 HNSW**：查询性能和精度更好，是目前的主流选择。

### 数据模型

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);
```

### 检索查询

```sql
-- 找最相似的 5 个文档
SELECT content, metadata,
       1 - (embedding <=> $1) AS similarity
FROM documents
ORDER BY embedding <=> $1
LIMIT 5;
```

`<=>` 是余弦距离运算符，`1 - distance` = 相似度。

## 架构决策

| 决策 | 建议 | 原因 |
|------|------|------|
| 首选方案 | pgvector | 与业务数据统一管理 |
| 索引类型 | HNSW | 查询质量和速度最优 |
| 维度 | 与 Embedding 模型匹配 | 1536（OpenAI small） |
| 元数据存储 | JSONB 字段 | 灵活支持过滤查询 |
| 距离函数 | 余弦距离 | 最通用 |
