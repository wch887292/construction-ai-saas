# 建筑工程AI · 轻量化合规提效 SaaS（一期 MVP）

> 让工程标书、施工方案、技术资料「一键出稿、合规可查、零废标风险」

![CI](https://img.shields.io/github/actions/workflow/status/wch887292/construction-ai-saas/ci.yml?label=CI&logo=github)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D22-green)

**署名**
- 公司：晋江市飞虹智科技企业管理有限公司
- 中心：飞扬企源研发中心
- 负责人：吴赐虹

---
---

## 🌐 品牌与官网

本仓库由 **晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心** 维护。

- 🏠 **官方网站**：[https://www.klai.top](https://www.klai.top) — 飞虹智 klAI · 泉州制造业 AI 服务商
- 📦 **开源矩阵**：[https://www.klai.top/opensource.html](https://www.klai.top/opensource.html)
- 🤖 **AI Agent 入口**：[https://www.klai.top/enterprise.html](https://www.klai.top/enterprise.html)



## 产品定位（来自商业计划复盘）

国内工程行业轻量化合规提效 AI SaaS 平台。放弃重资产 BIM / 数字孪生，聚焦**工程文档 AI** 轻资产、快落地、快回款赛道；锁定中型总包为核心付费客户。

## 核心壁垒（三位一体，已落地）

1. **规范溯源**：AI 生成的每个章节都绑定国标/行标/企业制度引用，无来源不出稿。
2. **人工复核强制节点**：AI 只出初稿，未经复核通过的版本不能标记为终稿（后端 `guardApproval` 硬拦截）。
3. **版本留痕**：每次生成/修订均存版本，可回看、可对比、可恢复。

## 一期四大刚需模块

| 模块 | 说明 |
| --- | --- |
| 投标AI助手 | 招标文件解析 · 标书初稿 · 废标风险自检 |
| 施工方案AI助手 | 专项方案生成 · 危大风险识别 · 合规自检 |
| 技术交底生成助手 | 高频轻量化技术交底自动生成 |
| 施工日志/周报生成 | 全员高频日志与周报自动生成 |

## 技术栈

- 前端：React + TypeScript + Vite + Tailwind CSS + React Router
- 后端：Node.js + Express + TypeScript
- 存储：Node 内置 `node:sqlite`（零原生依赖，数据访问层可一键切 Postgres）
- AI：可插拔 `AIProvider`，默认 `MockProvider` 本地模板生成（无需密钥即可演示完整合规链路）；设置环境变量可一键切换**真实大模型**（DeepSeek / 通义千问 / 腾讯混元 / OpenAI 兼容服务）

## 切换真实大模型（推荐 DeepSeek）

生成引擎实现了 OpenAI 兼容协议，只需在启动前设置环境变量，无需改代码：

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| `AI_PROVIDER` | 设为 `llm` 启用真实大模型；`mock` 或留空走本地模板 | `mock` |
| `LLM_API_KEY` | 大模型平台 API Key（必填，缺失时生成接口会明确报错） | 无 |
| `LLM_BASE_URL` | OpenAI 兼容接口地址（含 /v1） | `https://api.deepseek.com/v1` |
| `LLM_MODEL` | 模型名 | `deepseek-chat` |
| `AI_JSON_MODE` | 是否请求 JSON 模式输出，`0` 关闭（部分兼容服务不支持该字段时关闭） | `1` |
| `AI_TEMPERATURE` | 生成温度，合规文档建议低值 | `0.3` |
| `AI_TIMEOUT_MS` | 单次请求超时（毫秒） | `120000` |

主流平台接入参数：

```bash
# DeepSeek（默认）
AI_PROVIDER=llm LLM_API_KEY=sk-xxx LLM_MODEL=deepseek-chat

# 阿里通义千问
AI_PROVIDER=llm LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 \
  LLM_API_KEY=sk-xxx LLM_MODEL=qwen-plus

# 腾讯混元（OpenAI 兼容版）
AI_PROVIDER=llm LLM_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1 \
  LLM_API_KEY=xxx LLM_MODEL=hunyuan-turbos-latest
```

Windows PowerShell 启动示例：

```powershell
$env:AI_PROVIDER="llm"; $env:LLM_API_KEY="sk-xxx"; $env:LLM_MODEL="deepseek-chat"
npm start
```

> **合规不降级**：无论哪个模型，输出都经过 `server/src/llm.ts` 的**引用白名单校验**——LLM 编造/幻觉的规范编号会被替换为企业知识库内的真实规范（无来源不出稿），随后照常走人工复核强制节点与版本留痕。

## 运行

```bash
npm install
npm run build        # 构建前端 + 编译后端
npm run seed         # 写入演示租户/账号/规范库（仅首次）
npm start            # 启动服务 http://localhost:8787
```

开发模式（前后端热更新）：

```bash
npm run dev:server   # 终端1：后端 tsx watch
npm run dev:client   # 终端2：前端 vite (http://localhost:5173，代理 /api -> 8787)
```

## 演示账号

| 角色 | 邮箱 | 密码 |
| --- | --- | --- |
| 管理员 | admin@demo.com | admin123 |
| 复核员 | reviewer@demo.com | review123 |
| 成员 | member@demo.com | member123 |

## 体验路径（验证三位一体壁垒）

1. 用 **管理员** 登录 → 「AI 生成」选「投标AI助手」→ 填项目信息 → 生成初稿（带规范引用徽标 + 废标风险自检）。
2. 进入「文档与复核」打开该文档 → 此时状态为草稿，**成员/管理员不可越权通过**（强制复核节点）。
3. 用 **复核员** 登录 → 打开文档 → 填写意见 → 点「通过」→ 状态变为「已通过(终稿)」。若跳过复核直接改库，后端 `guardApproval` 会拦截。
4. 重新生成会创建新版本，「版本留痕」可回看并恢复历史版本。
5. 文档详情页可「导出 Word」（.docx）与「导出 PDF」（打印视图，浏览器另存为 PDF）——对标一键出稿交付场景。

## 功能亮点

- **真实大模型出稿**：OpenAI 兼容协议（DeepSeek/通义/混元/其他），引用白名单校验杜绝 AI 编造规范编号；缺 Key 时自动回退本地 Mock 演示模式。
- **知识库全文检索**：FTS5 + 中文 bigram + BM25 相关性排序，知识库页面即输即搜（规范名/编号/关键词）。
- **文档导出**：Word（.docx 可二次编辑）与 PDF（打印视图，浏览器原生渲染中文）。
- **零原生依赖**：Node 内置 `node:sqlite` 存储，无需安装数据库；前端构建产物由服务端直接托管，单进程即可运行。

## 测试

| 命令 | 说明 |
| --- | --- |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run test:llm` | LLM 链路测试（本地 mock OpenAI，8 场景：JSON 解析/幻觉引用替换/超时/报错等） |
| `npm run smoke` | 端到端冒烟（14 项：生成→溯源→强制复核→版本留痕，需先 `npm run seed` 并启动服务） |


---

## 🤝 社区支持

关注飞虹智 klAI 动态，获取最新开源项目更新与技术教程：

![社区支持二维码](https://github.com/construction-ai-saas/releases/download/v1.0.0-community/qrcode-community.png)

扫码加入 **飞虹智企微小助手**，获取：
- 技术答疑与部署指导
- 开源项目更新通知
- 本地化服务预约（泉州地区）
- 企业 AI 数字化咨询

---

*晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 负责人：吴赐虹*

## 目录结构

```
client/                前端 React 应用
server/src/            后端
  ├─ index.ts          服务入口（.env 加载 + FTS 索引重建）
  ├─ routes.ts         API 路由（鉴权/知识库/生成/文档/复核/版本/导出）
  ├─ db.ts             数据访问层（node:sqlite + FTS5 全文检索）
  ├─ ai.ts             AIProvider 接口 + Mock 模板（默认演示）
  ├─ llm.ts            真实大模型 Provider（OpenAI 兼容 + 引用白名单校验）
  ├─ llm.test.ts       LLM 链路测试（npm run test:llm）
  ├─ export.ts         文档导出（docx / 打印 HTML）
  ├─ compliance.ts     合规引擎（无来源不出稿 / 复核硬拦截 / 版本留痕）
  └─ seed.ts           种子数据（演示租户/账号/规范库）
data/                  运行时 SQLite 数据库（自动生成，不入库）
.github/workflows/     CI（类型检查 + LLM 测试 + 构建 + 冒烟）
```
