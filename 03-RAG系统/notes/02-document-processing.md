# 文档处理

## 在 RAG 架构中的位置

```
数据源 → 【文档处理】 → 分块 → Embedding → 向量库
         ^^^^^^^^^^^^
         加载 → 解析 → 清洗 → 元数据提取
```

文档处理是 Indexing 管线的第一步，质量直接决定后续检索效果。**垃圾进，垃圾出。**

## 处理流程

### 1. 加载（Load）

从不同来源读取原始文件：

| 来源 | 工具 | 说明 |
|------|------|------|
| 本地文件 | fs / pathlib | PDF、MD、TXT、DOCX |
| 网页 | cheerio / BeautifulSoup | HTML 爬取 |
| API | HTTP client | Notion、Confluence 等 |
| 数据库 | ORM / SQL | 结构化数据导出 |
| Git 仓库 | git API | 代码文件 |

### 2. 解析（Parse）

将不同格式转为纯文本 + 结构信息：

| 格式 | 挑战 | 推荐方案 |
|------|------|---------|
| **PDF** | 表格、多栏、扫描件 | `pdf-parse`（简单）/ Unstructured（复杂） |
| **Markdown** | 需保留标题层级 | 按标题分段解析 |
| **HTML** | 噪音多（导航、广告） | 提取正文（Readability 算法） |
| **DOCX** | 嵌入图片、样式 | `mammoth` 转 HTML 再提取 |
| **代码** | 需保留结构（函数、类） | AST 解析（tree-sitter） |

### 3. 清洗（Clean）

去除噪音，保留有效信息：

- 移除 HTML 标签、特殊字符
- 合并多余空白和换行
- 移除页眉页脚、页码
- 去除重复内容
- 统一编码（UTF-8）

### 4. 元数据提取（Metadata）

每个文档块都应携带元数据，用于检索时过滤和引用追溯：

```typescript
interface DocumentChunk {
  content: string;         // 文本内容
  metadata: {
    source: string;        // 文件路径或 URL
    title: string;         // 文档标题
    page: number;          // 页码（PDF）
    section: string;       // 所属章节
    createdAt: Date;       // 创建时间
    fileType: string;      // 文件类型
  };
}
```

## 架构决策

| 决策 | 建议 | 原因 |
|------|------|------|
| 解析库选择 | 简单场景 LangChain Loaders，复杂用 Unstructured | Unstructured 对表格/OCR 支持更好 |
| 元数据粒度 | 尽量丰富 | 后续过滤和引用追溯依赖元数据 |
| 异步处理 | 大文件用队列 | 避免阻塞在线服务 |
| 增量更新 | 记录文件 hash，只处理变化 | 避免全量重建索引 |
