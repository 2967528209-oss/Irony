# 阶段 1：AI Coding 工作流

## 学习目标

- 建立系统化的 AI 辅助开发工作流
- 掌握 Cursor 高级功能与 Skills 体系
- 形成「需求 → Prompt → 代码 → 验证」的闭环

## 核心产出

### Skills 体系（10 个全局 Skill）

存放在项目根目录 `.cursor/skills/`，覆盖全栈开发全链路：

| Skill | 职责 |
|-------|------|
| `project-structure` | 目录/文件命名、项目模板 |
| `coding-standards` | TS/JS + Python 编码规范 |
| `git-workflow` | Commit、分支、PR、版本管理 |
| `ai-coding-workflow` | Prompt 模式、上下文管理、验证闭环 |
| `documentation-standards` | 注释、文档模板 |
| `tech-stack-guide` | 技术栈选型偏好 |
| `quality-assurance` | 测试、Review、性能、安全 |
| `api-design` | REST API 设计规范 |
| `database-modeling` | Schema 设计、Migration |
| `env-and-deployment` | 环境变量、Docker、CI/CD |

### 学习笔记

| 笔记 | 内容 |
|------|------|
| [01-skills-system-design](notes/01-skills-system-design.md) | Skills 体系设计决策与总结 |
| [02-ai-coding-best-practices](notes/02-ai-coding-best-practices.md) | AI Coding 核心实践 |
| [03-context-and-prompt-patterns](notes/03-context-and-prompt-patterns.md) | 上下文管理与 Prompt 模式 |
| [04-mcp-integration](notes/04-mcp-integration.md) | MCP 协议与集成 |

## 知识清单完成状态

- [x] Cursor Rules 体系设计 → 以 Skills 方案实现
- [x] 结构化 Prompt 驱动开发
- [x] 上下文管理策略
- [x] AI Coding 最佳实践
- [x] MCP 集成与使用
- [x] 多模型切换策略
