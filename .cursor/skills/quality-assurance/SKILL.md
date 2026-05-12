---
name: quality-assurance
description: >-
  定义测试策略、代码审查清单、性能优化指南与安全实践。
  编写测试、审查代码、优化性能或评估安全性时使用。
disable-model-invocation: false
---

# 质量保障规范

## 测试策略

### 测试金字塔

```
        ╱  E2E   ╲        ← 少量关键路径
       ╱ 集成测试  ╲       ← 适量 API/组件交互
      ╱  单元测试   ╲      ← 大量核心逻辑
```

### 测试工具

| 类型 | TypeScript | Python |
|------|-----------|--------|
| 单元测试 | Vitest | pytest |
| 组件测试 | Testing Library | — |
| API 测试 | Vitest + supertest | pytest + httpx |
| E2E 测试 | Playwright | Playwright |

### 测试文件组织

```
src/
├── services/
│   ├── chatService.ts
│   └── chatService.test.ts    # 就近放置
├── utils/
│   ├── tokenCounter.ts
│   └── tokenCounter.test.ts
tests/
├── e2e/                       # E2E 测试独立目录
│   └── chat-flow.spec.ts
└── integration/               # 集成测试独立目录
    └── api-chat.test.ts
```

### 测试命名

```typescript
describe('ChatService', () => {
  describe('sendMessage', () => {
    it('should return streamed response for valid input', () => {});
    it('should throw AppError when API key is invalid', () => {});
    it('should retry on rate limit error', () => {});
  });
});
```

命名模式：`should [expected behavior] when [condition]`

### 测试覆盖要求

| 模块类型 | 最低覆盖率 | 说明 |
|----------|-----------|------|
| 核心业务逻辑 | 80% | services、核心 utils |
| API 端点 | 100% 路径覆盖 | 每个端点的成功/失败路径 |
| UI 组件 | 关键交互 | 不追求覆盖率数字，覆盖核心交互 |
| 工具函数 | 90% | 纯函数应高覆盖 |

### 测试原则

1. **测试行为而非实现**：不测试内部状态，测试输入输出
2. **独立性**：测试间不依赖执行顺序
3. **可读性**：测试即文档，读测试能理解功能
4. **Fast**：单元测试毫秒级完成
5. **Mock 最小化**：只 Mock 外部依赖（API、数据库），不 Mock 内部模块

## Code Review 清单

### 正确性

- [ ] 逻辑是否正确，是否处理了边界条件
- [ ] 是否有空指针/未定义引用风险
- [ ] 异步操作是否正确等待/处理
- [ ] 资源（连接、文件句柄）是否正确释放

### 安全性

- [ ] 用户输入是否经过校验和清洗
- [ ] 是否存在 SQL/NoSQL 注入风险
- [ ] 敏感信息（密钥、Token）是否泄露到日志或前端
- [ ] API 端点是否有适当的认证和授权
- [ ] Prompt Injection 风险是否防护（AI 应用场景）

### 可维护性

- [ ] 命名是否清晰准确
- [ ] 函数是否职责单一、长度合理（< 50 行）
- [ ] 是否有不必要的复杂度
- [ ] 是否遵循项目编码规范

### 性能

- [ ] 是否有不必要的重复计算或请求
- [ ] 数据库查询是否有 N+1 问题
- [ ] 大数据集是否有分页/流式处理
- [ ] React 组件是否有不必要的重渲染

## 性能优化指南

### 前端性能

| 维度 | 实践 |
|------|------|
| 渲染 | React.memo、useMemo、useCallback 用于昂贵计算 |
| 加载 | 路由级 lazy loading，图片懒加载 |
| 请求 | 请求去重、缓存（TanStack Query）、防抖/节流 |
| 包体积 | Tree shaking，动态 import，分析 bundle |

### 后端性能

| 维度 | 实践 |
|------|------|
| 数据库 | 合理索引，避免 N+1，使用连接池 |
| 缓存 | 热数据 Redis 缓存，Embedding 结果缓存 |
| 并发 | 异步 I/O，无阻塞操作 |
| AI 调用 | 流式响应，请求并行，结果缓存 |

### LLM 调用优化

| 策略 | 说明 |
|------|------|
| Prompt 缓存 | 相同 Prompt 缓存响应 |
| 模型路由 | 简单任务用小模型，复杂任务用大模型 |
| 上下文压缩 | 截断或摘要过长的对话历史 |
| 批量处理 | 多个 Embedding 请求合并批量调用 |
| 流式输出 | 使用 SSE 流式返回，降低用户感知延迟 |

## 安全实践

### 基本安全清单

1. **环境变量**：所有密钥/Token 通过环境变量管理，不硬编码
2. **输入校验**：使用 Zod/Pydantic 在入口处校验所有外部输入
3. **HTTPS**：生产环境强制 HTTPS
4. **CORS**：明确配置允许的源，不使用 `*`
5. **依赖安全**：定期运行 `npm audit` / `pip audit`
6. **日志脱敏**：日志中不记录密钥、密码、用户 PII

### AI 应用安全

1. **Prompt Injection 防护**：用户输入与系统指令明确分离
2. **输出审核**：对 LLM 输出进行内容安全过滤
3. **权限边界**：Agent Tool 的执行权限最小化
4. **成本控制**：设置 Token 用量上限和速率限制
5. **数据隔离**：多租户场景确保 RAG 数据隔离
