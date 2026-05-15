# A/B 测试与模型评估

## 为什么需要 A/B 测试

AI 应用中经常面临选择：

```
改了 Prompt → 效果变好了还是变差了？
换了模型   → GPT-4o vs DeepSeek 哪个好？
调了参数   → temperature 0.3 vs 0.7 哪个准？
```

凭感觉判断不靠谱。A/B 测试让你用**数据说话**。

## AI A/B 测试的特殊之处

传统 A/B 测试：按钮颜色变了 → 点击率变了没有 → 有唯一指标

AI A/B 测试：**什么算"好"本身就不确定**：

| 指标 | 衡量什么 | 怎么衡量 |
|------|---------|---------|
| 准确性 | 回答对不对 | 人工评估 / LLM 评估 |
| 相关性 | 回答切题吗 | LLM 打分 |
| 安全性 | 有没有有害内容 | 审核 API |
| 延迟 | 快不快 | 自动记录 |
| Token 成本 | 贵不贵 | 自动记录 |
| 用户满意度 | 用户怎么看 | 点赞/点踩 |

## 实现方式

### 1. 流量分配

```typescript
function getVariant(userId: string): 'A' | 'B' {
  // 按用户 ID 哈希分组，保证同一用户始终进同一组
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % 2 === 0 ? 'A' : 'B';
}

async function chat(userId: string, query: string) {
  const variant = getVariant(userId);

  const config = variant === 'A'
    ? { model: 'deepseek-chat', prompt: promptV1 }
    : { model: 'deepseek-chat', prompt: promptV2 };

  const startTime = Date.now();
  const response = await callLLM(config, query);
  const latency = Date.now() - startTime;

  // 记录实验数据
  logExperiment({
    variant,
    userId,
    query,
    response: response.content,
    tokens: response.usage.total_tokens,
    latency,
  });

  return response.content;
}
```

### 2. 数据收集

```typescript
interface ExperimentLog {
  variant: string;
  userId: string;
  query: string;
  response: string;
  tokens: number;
  latency: number;
  userFeedback?: 'positive' | 'negative';  // 用户反馈（可选）
  timestamp: string;
}
```

### 3. 分析对比

```
组 A (Prompt V1):
  平均延迟: 2.3s
  平均 Token: 450
  用户满意率: 78%

组 B (Prompt V2):
  平均延迟: 2.1s
  平均 Token: 380
  用户满意率: 85%

→ Prompt V2 更优，切全量
```

## 离线评估（更实用）

A/B 测试需要线上流量。对于小项目，**离线评估**更实用——用固定测试集跑两个版本对比：

```typescript
const testCases = [
  { query: '什么是 RAG', expectedTopics: ['检索增强生成', 'retrieval'] },
  { query: '向量数据库有哪些', expectedTopics: ['pgvector', 'Pinecone', 'Chroma'] },
];

for (const variant of ['promptV1', 'promptV2']) {
  for (const testCase of testCases) {
    const result = await callLLM(variant, testCase.query);
    const score = evaluateRelevance(result, testCase.expectedTopics);
    console.log(`${variant} | ${testCase.query} | score: ${score}`);
  }
}
```

你在阶段 3 做的 `06-evaluation.ts` 就是这种离线评估。

## 模型评估维度

选模型时的对比框架：

| 维度 | 怎么测 |
|------|--------|
| 质量 | 固定测试集 + LLM 打分 |
| 延迟 | 同一批请求，对比 P50/P95 |
| 成本 | 同样任务消耗的 Token 数 |
| 一致性 | 同一问题问多次，回答是否稳定 |
| 指令遵循 | 是否按要求的格式/角色回答 |

## 核心总结

对于个人/小团队项目：
- **离线评估** > A/B 测试（不需要线上流量）
- **固定测试集** + **LLM 自动评估** 是最实用的组合
- 改 Prompt 或换模型前，先跑一遍测试集确认效果
