# MCP（Model Context Protocol）集成与使用

## 核心概念

MCP 是 Anthropic 推出的开放协议，让 AI 模型与外部工具/数据源交互。在 Cursor 中，MCP Server 扩展了 Agent 的能力边界。

### 架构

```
Cursor Agent ←→ MCP Client ←→ MCP Server ←→ 外部服务/工具
```

### 三大能力

| 能力 | 说明 | 示例 |
|------|------|------|
| **Tools** | AI 可调用的工具函数 | 数据库查询、API 调用、文件处理 |
| **Resources** | AI 可读取的数据源 | 数据库 Schema、配置信息 |
| **Prompts** | 预定义的 Prompt 模板 | 代码审查模板、SQL 生成模板 |

## Cursor 中使用 MCP

### 配置方式

在 Cursor Settings → MCP 中添加 MCP Server，或在项目 `.cursor/mcp.json` 中配置：

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "mcp-server-package"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}
```

### 常用 MCP Server

| Server | 功能 | 典型用途 |
|--------|------|----------|
| `@modelcontextprotocol/server-filesystem` | 文件系统操作 | 读写文件、目录遍历 |
| `@modelcontextprotocol/server-github` | GitHub API | PR 管理、Issue 操作 |
| `@modelcontextprotocol/server-postgres` | PostgreSQL | 数据库查询、Schema 浏览 |
| `@modelcontextprotocol/server-fetch` | HTTP 请求 | 抓取网页内容 |
| `mcp-feedback-enhanced` | 用户交互反馈 | 阶段性确认、结果展示 |

### 使用方式

Agent 通过 `CallMcpTool` 调用 MCP Server 提供的工具：

```
CallMcpTool:
  server: "server-name"
  toolName: "tool-name"
  arguments: { ... }
```

通过 `FetchMcpResource` 读取 MCP Server 暴露的资源。

## 自定义 MCP Server 开发

### 技术栈

- TypeScript + `@modelcontextprotocol/sdk`
- 或 Python + `mcp` 包

### 基础结构（TypeScript）

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });

server.tool('my-tool', { param: z.string() }, async ({ param }) => {
  return { content: [{ type: 'text', text: `Result: ${param}` }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## 应用场景

1. **数据库集成**：让 Agent 直接查询数据库，了解 Schema 结构
2. **文档搜索**：接入内部知识库，提供上下文
3. **API 测试**：Agent 直接调用业务 API 验证功能
4. **监控数据**：读取日志/指标数据辅助 Debug
5. **用户交互**：通过 feedback MCP 实现阶段性确认

## 参考资源

- [MCP 官方文档](https://modelcontextprotocol.io)
- [MCP Server 列表](https://github.com/modelcontextprotocol/servers)
