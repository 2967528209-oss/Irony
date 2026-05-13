# 阶段 3：RAG 系统开发

## 学习目标

- 掌握 RAG（检索增强生成）完整链路
- 理解 Embedding、向量检索、重排序
- 能构建生产级知识库问答系统

## 学习路线

| 序号 | 知识点 | 状态 | 笔记 |
|------|--------|------|------|
| 1 | RAG 架构全景 | 完成 | [01-rag-architecture.md](notes/01-rag-architecture.md) |
| 2 | 文档处理 | 完成 | [02-document-processing.md](notes/02-document-processing.md) |
| 3 | 文本分块策略 | 完成 | [03-chunking-strategies.md](notes/03-chunking-strategies.md) |
| 4 | Embedding 模型 | 完成 | [04-embedding.md](notes/04-embedding.md) |
| 5 | 向量数据库 | 完成 | [05-vector-database.md](notes/05-vector-database.md) |
| 6 | 检索策略 | 完成 | [06-retrieval-strategies.md](notes/06-retrieval-strategies.md) |
| 7 | 重排序与结果过滤 | 完成 | [07-reranking.md](notes/07-reranking.md) |
| 8 | Query 改写与分解 | 完成 | [08-query-transformation.md](notes/08-query-transformation.md) |
| 9 | 引用追溯与来源标注 | 完成 | [09-citation-and-source.md](notes/09-citation-and-source.md) |
| 10 | 评估体系 | 完成 | [10-evaluation.md](notes/10-evaluation.md) |
| 11 | **架构总览** | 完成 | [11-architecture-overview.md](notes/11-architecture-overview.md) |

## 实践项目

| 项目 | 状态 | 代码 |
|------|------|------|
| 文档知识库（MD 导入 + 语义检索 + 交互问答） | 完成 | rag-app/src/01~04 |
| Advanced RAG（Multi-query + RRF 融合） | 完成 | rag-app/src/05-multi-query.ts |
| RAG 评估管线（Recall@3 + Faithfulness 自动评估） | 完成 | rag-app/src/06-evaluation.ts |

## 评估结果

```
Recall@3:      8/8 = 100.0%
Faithfulness:  1.00 / 1.00
```
