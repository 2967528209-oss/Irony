# Cursor Skills 体系设计

## 核心概念

### Skills vs Rules

| 维度 | Rules | Skills |
|------|-------|--------|
| 存放位置 | `.cursor/rules/` | `.cursor/skills/` |
| 触发方式 | 总是加载 / 文件匹配 | 按需加载 / 自动触发 |
| 结构 | 单文件 `.mdc` | 目录结构（SKILL.md + 参考文件） |
| 适用场景 | 简单的全局约束 | 复杂的领域知识和工作流 |
| 可扩展性 | 有限 | 支持脚本、参考文档、渐进式加载 |

本项目选择 Skills 方案，因为：
- 每个规范领域内容较多，需要结构化组织
- 支持 `disable-model-invocation: false` 实现上下文感知的自动触发
- 随 git 提交，实现「拉代码即获得规范」的可移植性

### 关键设计决策

1. **自动触发 (`disable-model-invocation: false`)**：所有 Skill 设置为自动触发，Agent 根据 description 中的触发条件判断何时加载。好处是新 Cursor 进程无需人工干预即可遵循规范。

2. **description 中包含 WHAT + WHEN**：每个 Skill 的 description 同时说明「做什么」和「什么时候用」，帮助 Agent 精准匹配场景。

3. **项目级而非全局级**：Skills 放在 `.cursor/skills/`（项目目录），而非 `~/.cursor/skills/`（全局目录），确保与代码一起版本管理。

4. **gitignore 配置**：通过项目 `.gitignore` 中的否定规则 `!.cursor/` + `.cursor/*` + `!.cursor/skills/` 覆盖全局 `.gitignore_global` 中的 `.cursor` 忽略规则。

## 体系总览

共 10 个 Skill，覆盖全栈开发全链路：

| Skill | 职责 | 触发场景 |
|-------|------|----------|
| `project-structure` | 目录/文件命名、项目模板 | 创建文件、目录、新项目 |
| `coding-standards` | TS/JS + Python 编码风格 | 编写或审查代码 |
| `git-workflow` | Commit、分支、PR、版本管理 | git 操作 |
| `ai-coding-workflow` | Prompt 模式、上下文管理、验证闭环 | AI 辅助开发 |
| `documentation-standards` | 注释、README、API 文档、学习笔记 | 编写文档 |
| `tech-stack-guide` | 技术栈选型偏好 | 初始化项目、引入依赖 |
| `quality-assurance` | 测试、Review、性能、安全 | 测试和审查 |
| `api-design` | REST API 设计规范 | 设计 API 端点 |
| `database-modeling` | Schema 设计、Migration 管理 | 数据库建模 |
| `env-and-deployment` | 环境变量、Docker、CI/CD | 配置和部署 |

## SKILL.md 编写规范

### 文件结构

```yaml
---
name: skill-name                    # kebab-case，最多 64 字符
description: >-                     # 描述 WHAT + WHEN
  做什么的描述。什么时候使用。
disable-model-invocation: false     # 允许自动触发
---

# 标题

## 章节 1
[核心内容]

## 章节 2
[核心内容]
```

### 编写原则

1. **控制在 500 行以内**：避免上下文膨胀
2. **只写 Agent 不知道的**：不解释通用编程概念
3. **表格优于段落**：结构化信息用表格呈现
4. **代码示例要精简**：展示模式而非完整实现
5. **术语一致**：全文统一用语

## 踩坑记录

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `.cursor/skills/` 不出现在 git 暂存区 | 全局 `~/.gitignore_global` 中有 `.cursor` 规则 | 项目 `.gitignore` 添加 `!.cursor/` + `.cursor/*` + `!.cursor/skills/` 否定规则 |
| Skill 不被 Agent 自动使用 | 默认 `disable-model-invocation: true` | 显式设置为 `false` |

## 参考资源

- Cursor Skills 创建指南：`~/.cursor/skills-cursor/create-skill/SKILL.md`
- 项目 Skills 目录：`.cursor/skills/`
