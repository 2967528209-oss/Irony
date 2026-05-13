# 重排序（Reranker）与结果过滤

## 为什么需要重排序

向量检索是**近似匹配**（ANN），速度快但精度有限。Reranker 是**精确匹配**，速度慢但精度高。

```
架构类比：
向量检索 = 粗筛（海选）：从 100 万文档中快速找出 Top-20
Reranker = 精排（决赛）：从 Top-20 中精确排出最终 Top-5
```

两阶段检索是工业标准：

```
全量文档 ──[向量检索]──→ Top-20 ──[Reranker]──→ Top-5 ──→ LLM
           毫秒级              百毫秒级
```

## Reranker 工作原理

向量检索：分别编码 query 和 doc，计算向量相似度（Bi-encoder）
Reranker：同时输入 query + doc，直接输出相关性分数（Cross-encoder）

```
Bi-encoder（向量检索）：
  encode("问题") → vec₁
  encode("文档") → vec₂
  score = cosine(vec₁, vec₂)
  → 快，但交互弱

Cross-encoder（Reranker）：
  score = model("问题 [SEP] 文档")
  → 慢，但理解深（query 和 doc 在模型内部充分交互）
```

## 主流 Reranker

| 模型 | 类型 | 特点 |
|------|------|------|
| Cohere Rerank | API 服务 | 即用，效果好 |
| BGE Reranker | 开源 | 可本地部署 |
| Jina Reranker | API + 开源 | 多语言支持好 |

## 结果过滤策略

Reranker 之后或之前，还需要过滤：

| 过滤维度 | 做法 | 目的 |
|----------|------|------|
| 相关性阈值 | score < 0.3 丢弃 | 去除不相关结果 |
| 去重 | 内容相似度 > 0.95 合并 | 减少冗余 |
| 元数据过滤 | 按时间、来源、类型过滤 | 缩小检索范围 |
| 最大 token 限制 | 总文本不超过 LLM 窗口预算 | 避免超出上下文 |

## 架构决策

| 决策 | 建议 | 原因 |
|------|------|------|
| 是否用 Reranker | 推荐 | 显著提升检索精度 |
| 粗筛数量 | 20-50 | 给 Reranker 足够候选 |
| 精排数量 | 3-5 | 最终送入 LLM 的文档 |
| Reranker 选择 | Cohere（API）/ BGE（本地） | 按部署环境选 |
