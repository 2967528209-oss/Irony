---
name: env-and-deployment
description: >-
  定义环境变量管理、多环境配置、Docker 容器化与 CI/CD 部署规范。
  配置环境变量、编写 Dockerfile、设置 CI/CD 流水线或部署应用时使用。
disable-model-invocation: false
---

# 环境与部署规范

## 环境变量管理

### 文件规范

| 文件 | 用途 | Git 追踪 |
|------|------|----------|
| `.env.example` | 变量清单模板（无真实值） | 是 |
| `.env.local` | 本地开发配置 | 否 |
| `.env.production` | 生产环境配置 | 否 |
| `.env.test` | 测试环境配置 | 否 |

### .env.example 模板

```bash
# === LLM API ===
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# === Database ===
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# === Auth ===
AUTH_SECRET=generate-a-random-secret
NEXTAUTH_URL=http://localhost:3000

# === Redis ===
REDIS_URL=redis://localhost:6379

# === App ===
NODE_ENV=development
PORT=3000
```

### 命名约定

- 全大写 `UPPER_SNAKE_CASE`
- 按功能分组，组间空行 + 注释分隔
- 服务名作前缀：`OPENAI_API_KEY`、`REDIS_URL`、`AUTH_SECRET`
- URL 类型以 `_URL` 结尾，密钥类型以 `_KEY` 或 `_SECRET` 结尾

### 代码中读取

TypeScript 使用 Zod 校验环境变量：

```typescript
import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
```

Python 使用 Pydantic Settings：

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    database_url: str
    debug: bool = False

    class Config:
        env_file = ".env.local"

settings = Settings()
```

## Docker 规范

### Dockerfile 标准（Node.js）

```dockerfile
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### Docker Compose（本地开发）

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### Docker 原则

1. **多阶段构建**：分离构建依赖和运行时，减小镜像体积
2. **非 root 用户**：生产镜像使用非 root 用户运行
3. **层缓存**：先 COPY 依赖文件，再 COPY 源码，利用缓存
4. **`.dockerignore`**：排除 `node_modules`、`.env`、`.git` 等

## CI/CD 流水线

### GitHub Actions 基础模板

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check
      - run: pnpm lint
      - run: pnpm test
```

### CI 检查项

| 检查 | 命令 | 说明 |
|------|------|------|
| 类型检查 | `pnpm type-check` | `tsc --noEmit` |
| 代码规范 | `pnpm lint` | ESLint |
| 单元测试 | `pnpm test` | Vitest |
| 构建验证 | `pnpm build` | 确保能正常构建 |

### 部署策略

| 场景 | 方案 | 触发 |
|------|------|------|
| 前端/全栈 | Vercel 自动部署 | Push to main |
| 自定义后端 | Docker + VPS | GitHub Actions → SSH deploy |
| 预览环境 | Vercel Preview | PR 创建时 |

## 多环境管理

```
开发 (local)     → .env.local        → localhost
预览 (preview)   → Vercel env vars   → PR preview URL
生产 (production)→ Vercel/VPS env    → production URL
```

环境差异通过环境变量控制，代码本身不感知环境。
