---
name: project-structure
description: >-
  定义项目目录结构、文件命名、模块组织的全局规范。
  当创建新文件、新目录、新模块，或进行项目脚手架搭建时使用。
disable-model-invocation: false
---

# 项目结构与命名规范

## 目录命名

- 顶层阶段目录：`XX-描述/` 格式（如 `01-AI-Coding工作流/`）
- 功能模块目录：`kebab-case`（如 `user-auth/`、`chat-history/`）
- 组件目录：`PascalCase`（如 `ChatWindow/`、`MessageList/`）
- 特殊目录保持约定名：`src/`、`lib/`、`utils/`、`types/`、`config/`、`tests/`、`scripts/`、`docs/`

## 文件命名

| 类型 | 命名格式 | 示例 |
|------|----------|------|
| React 组件 | `PascalCase.tsx` | `ChatWindow.tsx` |
| 工具/辅助函数 | `camelCase.ts` | `formatDate.ts` |
| 常量/配置 | `camelCase.ts` 或 `UPPER_SNAKE.ts` | `apiConfig.ts` |
| 类型定义 | `camelCase.types.ts` | `message.types.ts` |
| 测试文件 | `*.test.ts` / `*.spec.ts` | `chatService.test.ts` |
| 样式文件 | 与组件同名 | `ChatWindow.module.css` |
| Python 模块 | `snake_case.py` | `vector_store.py` |
| 环境配置 | `.env.*` | `.env.local`、`.env.production` |

## 标准项目结构（全栈应用）

```
project-root/
├── .cursor/                 # Cursor 配置
│   └── skills/              # 项目级 Skill
├── src/
│   ├── app/                 # 页面路由（Next.js App Router）
│   ├── components/          # 可复用 UI 组件
│   │   ├── ui/              # 基础 UI 组件
│   │   └── features/        # 业务功能组件
│   ├── lib/                 # 核心库与客户端封装
│   ├── services/            # 业务逻辑与 API 调用
│   ├── hooks/               # 自定义 React Hooks
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 通用工具函数
│   └── config/              # 应用配置
├── server/                  # 后端服务（如使用分离后端）
│   ├── routes/              # API 路由
│   ├── services/            # 业务服务
│   ├── models/              # 数据模型
│   └── middleware/          # 中间件
├── tests/                   # 测试文件
├── scripts/                 # 构建/部署脚本
├── docs/                    # 项目文档
└── public/                  # 静态资源
```

## Python 项目结构

```
project-root/
├── src/
│   └── package_name/
│       ├── __init__.py
│       ├── core/            # 核心逻辑
│       ├── api/             # API 层
│       ├── models/          # 数据模型
│       ├── services/        # 业务服务
│       └── utils/           # 工具函数
├── tests/
├── scripts/
└── docs/
```

## 模块组织原则

1. **按功能聚合**：相关文件放在同一目录下，而非按文件类型分散
2. **单一职责**：每个模块/文件只负责一个明确的功能
3. **就近原则**：类型定义、测试文件尽量与源码放在同一目录
4. **避免深层嵌套**：目录层级不超过 4 层
5. **导出入口**：每个功能模块通过 `index.ts` 统一导出公共 API

## 索引文件规则

```typescript
// components/ui/index.ts — 统一导出
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
```

只在模块边界创建索引文件，不在每个子目录都创建。
