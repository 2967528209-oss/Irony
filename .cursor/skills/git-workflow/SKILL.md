---
name: git-workflow
description: >-
  定义 Git 提交信息格式、分支策略、PR 规范与版本管理。
  执行 git commit、创建分支、提交 PR 或讨论版本发布时使用。
disable-model-invocation: false
---

# Git 工作流规范

## 提交信息格式（Conventional Commits）

```
<type>(<scope>): <subject>

[可选正文]

[可选脚注]
```

### Type 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(chat): add streaming response` |
| `fix` | 修复缺陷 | `fix(auth): resolve token refresh loop` |
| `docs` | 文档变更 | `docs: update RAG architecture guide` |
| `style` | 代码格式（不影响逻辑） | `style: fix indentation in utils` |
| `refactor` | 重构（无功能变化） | `refactor(api): extract request handler` |
| `perf` | 性能优化 | `perf(search): add embedding cache` |
| `test` | 测试相关 | `test(agent): add tool execution tests` |
| `chore` | 构建/工具/依赖 | `chore: upgrade langchain to v0.3` |
| `ci` | CI/CD 变更 | `ci: add deployment workflow` |

### Subject 规则

- 使用英文，首字母小写
- 祈使语气（add / fix / update，非 added / fixes）
- 不超过 72 个字符
- 末尾不加句号

### Scope 约定

Scope 对应功能模块名：`chat`、`auth`、`rag`、`agent`、`api`、`ui`、`db`、`config`

### 正文与脚注

- 正文：解释 **why** 而非 what，与 subject 空一行
- 破坏性变更：正文以 `BREAKING CHANGE:` 开头
- 关联 Issue：`Closes #123` 或 `Refs #456`

## 分支策略（GitHub Flow）

```
main ─────────────────────────────────────────→
  ├── feat/chat-streaming ──── PR ──── merge ──→
  ├── fix/token-refresh ─────── PR ──── merge ─→
  └── docs/rag-guide ────────── PR ──── merge ─→
```

### 分支命名

`<type>/<short-description>`

| 类型 | 格式 | 示例 |
|------|------|------|
| 功能 | `feat/description` | `feat/chat-streaming` |
| 修复 | `fix/description` | `fix/token-refresh` |
| 重构 | `refactor/description` | `refactor/api-layer` |
| 文档 | `docs/description` | `docs/rag-architecture` |
| 实验 | `exp/description` | `exp/new-embedding-model` |

### 分支规则

- `main` 始终保持可部署状态
- 功能分支从 `main` 创建，完成后通过 PR 合并回 `main`
- 分支名使用 `kebab-case`，简洁明了
- 长期分支定期 rebase `main` 保持同步

## Pull Request 规范

### PR 标题

同 Commit Message 的 `<type>(<scope>): <subject>` 格式。

### PR 描述模板

```markdown
## Summary
<1-3 句话概述变更内容与目的>

## Changes
- 具体变更点 1
- 具体变更点 2

## Test Plan
- [ ] 单元测试通过
- [ ] 手动验证功能正常
- [ ] 无回归影响
```

### PR 原则

1. **小而聚焦**：每个 PR 只做一件事，控制在 300 行以内
2. **自包含**：PR 内的变更可独立理解和审查
3. **先 Review 后 Merge**：至少一人审核（个人项目可自审）
4. **Squash Merge**：合并时压缩为一个有意义的 commit

## 版本标签

遵循 Semantic Versioning：`vMAJOR.MINOR.PATCH`

| 变更类型 | 版本号变化 | 示例 |
|----------|-----------|------|
| 破坏性变更 | MAJOR + 1 | `v1.0.0` → `v2.0.0` |
| 新功能（向后兼容） | MINOR + 1 | `v1.0.0` → `v1.1.0` |
| Bug 修复 | PATCH + 1 | `v1.0.0` → `v1.0.1` |

## .gitignore 必须包含

```
node_modules/
.env*
!.env.example
dist/
.next/
__pycache__/
*.pyc
.venv/
.DS_Store
```
