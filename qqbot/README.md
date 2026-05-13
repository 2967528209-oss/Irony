# QQ Bot - DeepSeek 接入

QQ 群/私聊 AI 助手，通过 NapCat + OneBot v11 协议对接 QQ，使用 DeepSeek 生成回复。

## 架构

```
QQ 服务器 ←──NTQQ──→ NapCat(本地) ←──WS──→ bot.ts ←──HTTPS──→ DeepSeek API
```

## 部署步骤

### 1. 安装 NapCat

```bash
# 下载：https://github.com/NapNeko/NapCatQQ/releases
# Apple Silicon 选 NapCat-darwin-arm64.zip，Intel 选 x64

# 解压并赋权
unzip NapCat-darwin-arm64.zip -d ~/NapCat
cd ~/NapCat
chmod +x napcat
```

### 2. 配置 NapCat

创建 `~/NapCat/config/onebot11.json`：

```json
{
  "ws": {
    "enable": true,
    "host": "127.0.0.1",
    "port": 3001
  },
  "wsReverse": {
    "enable": false
  }
}
```

### 3. 启动 NapCat 并登录 QQ

```bash
cd ~/NapCat
./napcat --framework
```

打开控制台输出的 WebUI 地址，扫码登录 QQ 小号。

### 4. 配置环境变量

确认项目根目录 `.env.local` 包含：

```bash
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
NAPCAT_WS_URL=ws://127.0.0.1:3001
```

### 5. 启动 Bot

```bash
cd qqbot
pnpm install
pnpm start
```

看到 `[WS] 已连接 NapCat ✅` 即成功。

## 使用方式

| 场景 | 方式 |
|------|------|
| 群聊 | 发送 `/ai 你的问题` |
| 私聊 | 直接发消息 |
| 清除记忆 | 发送 `/clear` |

## 可选配置

在 `.env.local` 中可自定义：

```bash
BOT_TRIGGER=/ai                           # 群聊触发前缀
BOT_SYSTEM_PROMPT=你是一个QQ群AI助手       # System Prompt
NAPCAT_TOKEN=                              # NapCat access token（如果设置了）
DEEPSEEK_MODEL=deepseek-chat               # 模型名
```

## TODO

- [ ] 部署 NapCat 并联通 Bot（回家后）
- [ ] 接入 Grok（xAI API，需注册 console.x.ai 获取 key）
- [ ] 图片生成功能（/画 指令，接入 grok-2-image 或 DALL-E 3）
- [ ] 模型路由（/ai → DeepSeek, /grok → Grok）

## 注意事项

- 用 QQ 小号，NapCat 是非官方方案，有封号风险
- Mac 需要保持开机运行
- NapCat 每 30 天需重新登录
