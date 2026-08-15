# Construction-AI SaaS · Lightweight Compliance-Boosting SaaS (Phase 1 MVP)

> One-click drafting of engineering bids, construction plans, and technical docs — "compliant, traceable, zero bid-rejection risk"

[![CI](https://img.shields.io/github/actions/workflow/status/wch887292/construction-ai-saas/ci.yml?label=CI&logo=github)](https://github.com/wch887292/construction-ai-saas/actions)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-green)](https://nodejs.org)

> 中文: [README.md](README.md)

**Attribution**
- Company: Jinjiang Feihongzhi Technology Enterprise Management Co., Ltd.
- R&D Center: Feiyang Qiyuan R&D Center
- Lead: Wu Cihong

---

## 🌐 Brand & Official Site

Maintained by **Jinjiang Feihongzhi Technology Enterprise Management Co., Ltd. · Feiyang Qiyuan R&D Center**.

- 🏠 **Official site**: [https://www.klai.top](https://www.klai.top) — Feihongzhi klAI · Quanzhou manufacturing-AI service provider
- 📦 **Open-source matrix**: [https://www.klai.top/opensource.html](https://www.klai.top/opensource.html)
- 🤖 **AI Agent portal**: [https://www.klai.top/enterprise.html](https://www.klai.top/enterprise.html)

## Product Positioning

A lightweight, compliance-focused AI SaaS for China's construction industry. Instead of heavy BIM / digital-twin assets, it focuses on the **engineering-document AI** track — light asset, fast landing, fast payback — targeting mid-sized general contractors as the core paying customers.

## Core Moat (trinity, already implemented)

1. **Standard tracing**: every AI-generated section binds a citation to national/industry/enterprise standards — no source, no draft.
2. **Mandatory human-review gate**: AI only produces a first draft; a version cannot be marked final until review passes (hard-blocked by backend `guardApproval`).
3. **Version trail**: every generation/revision is versioned — viewable, comparable, recoverable.

## Phase-1 Four Essential Modules

| Module | Description |
| --- | --- |
| Bid AI Assistant | Tender parsing · bid first draft · bid-rejection risk self-check |
| Construction Plan AI Assistant | Special-plan generation · high-risk identification · compliance self-check |
| Technical Disclosure Generator | High-frequency lightweight technical disclosures auto-generated |
| Construction Log/Weekly Report | Org-wide high-frequency logs & weekly reports auto-generated |

## Tech Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS + React Router
- Backend: Node.js + Express + TypeScript
- Storage: Node built-in `node:sqlite` (zero native deps; DAL can switch to Postgres in one line)
- AI: pluggable `AIProvider`, default `MockProvider` local template generation (no key needed to demo the full compliance chain); env var switches to a **real LLM** (DeepSeek / Tongyi Qwen / Tencent Hunyuan / OpenAI-compatible)

## Switch to a real LLM (DeepSeek recommended)

The generation engine implements the OpenAI-compatible protocol — just set env vars before startup, no code change:

| Env var | Description | Default |
| --- | --- | --- |
| `AI_PROVIDER` | `llm` to enable real model; `mock` or empty for local template | `mock` |
| `LLM_API_KEY` | LLM platform API key (required; missing key yields a clear error) | none |
| `LLM_BASE_URL` | OpenAI-compatible endpoint (include /v1) | `https://api.deepseek.com/v1` |
| `LLM_MODEL` | Model name | `deepseek-chat` |
| `AI_JSON_MODE` | Request JSON mode, `0` to disable (some compat services don't support it) | `1` |
| `AI_TEMPERATURE` | Generation temperature; low value recommended for compliance docs | `0.3` |
| `AI_TIMEOUT_MS` | Single-request timeout (ms) | `120000` |

Mainstream platform params:

```bash
# DeepSeek (default)
AI_PROVIDER=llm LLM_API_KEY=sk-xxx LLM_MODEL=deepseek-chat

# Alibaba Tongyi Qwen
AI_PROVIDER=llm LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1 \
  LLM_API_KEY=sk-xxx LLM_MODEL=qwen-plus

# Tencent Hunyuan (OpenAI-compatible)
AI_PROVIDER=llm LLM_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1 \
  LLM_API_KEY=xxx LLM_MODEL=hunyuan-turbos-latest
```

Windows PowerShell example:
```powershell
$env:AI_PROVIDER="llm"; $env:LLM_API_KEY="sk-xxx"; $env:LLM_MODEL="deepseek-chat"
npm start
```

> **Compliance never degrades**: regardless of model, output passes the **citation allowlist validation** in `server/src/llm.ts` — hallucinated/standard numbers fabricated by the LLM are replaced with real standards from the enterprise knowledge base (no source, no draft), then proceed through the mandatory review gate and version trail.

## Run

```bash
npm install
npm run build        # build frontend + compile backend
npm run seed         # seed demo tenant/accounts/standard library (first time only)
npm start            # start service http://localhost:8787
```

Dev mode (hot reload frontend + backend):
```bash
npm run dev:server   # terminal 1: backend tsx watch
npm run dev:client   # terminal 2: frontend vite (http://localhost:5173, proxies /api -> 8787)
```

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@demo.com | admin123 |
| Reviewer | reviewer@demo.com | review123 |
| Member | member@demo.com | member123 |

## Experience Path (validate the trinity moat)

1. Log in as **Admin** → "AI Generate" → pick "Bid AI Assistant" → fill project info → generate draft (with standard-citation badges + bid-rejection risk self-check).
2. Open the doc in "Documents & Review" → status is **draft**, **member/admin cannot bypass approval** (mandatory review gate).
3. Log in as **Reviewer** → open doc → fill comments → click "Approve" → status becomes "Approved (final)". If review is skipped and the DB changed directly, backend `guardApproval` blocks it.
4. Regenerating creates a new version; "Version Trail" lets you review and restore history.
5. The doc detail page can "Export Word" (.docx) and "Export PDF" (print view, browser-native Chinese rendering) — for the one-click delivery scenario.

## Feature Highlights

- **Real-LLM drafting**: OpenAI-compatible (DeepSeek/Tongyi/Hunyuan/others), citation allowlist blocks fabricated standard numbers; auto-falls back to local Mock demo mode when key is missing.
- **KB full-text search**: FTS5 + Chinese bigram + BM25 relevance ranking, instant search on the KB page (standard name/number/keyword).
- **Document export**: Word (.docx, re-editable) and PDF (print view, native Chinese rendering).
- **Zero native deps**: Node built-in `node:sqlite` storage, no DB install; frontend build served directly by the backend, single process runs all.

## Testing

| Command | Description |
| --- | --- |
| `npm run typecheck` | TypeScript type check |
| `npm run test:llm` | LLM chain test (local mock OpenAI, 8 scenarios: JSON parse / hallucination replacement / timeout / error, etc.) |
| `npm run smoke` | E2E smoke (14 items: generate→trace→mandatory review→version trail; requires `npm run seed` + service running) |

---

## 🤝 Community Support

Follow Feihongzhi klAI for the latest open-source updates and technical tutorials:

![Community QR](https://github.com/construction-ai-saas/releases/download/v1.0.0-community/qrcode-community.png)

Scan to join the **Feihongzhi WeChat assistant** for:
- Technical Q&A and deployment guidance
- Open-source project update notifications
- Localization service booking (Quanzhou area)
- Enterprise AI digitalization consulting

---

*Jinjiang Feihongzhi Technology Enterprise Management Co., Ltd. · Feiyang Qiyuan R&D Center · Lead: Wu Cihong*

## Directory Structure

```
client/                 # React frontend app
server/src/             # backend
  ├─ index.ts          # service entry (.env load + FTS index rebuild)
  ├─ routes.ts         # API routes (auth/KB/generate/doc/review/version/export)
  ├─ db.ts             # data access layer (node:sqlite + FTS5 full-text search)
  ├─ ai.ts             # AIProvider interface + Mock template (default demo)
  ├─ llm.ts            # real LLM Provider (OpenAI-compatible + citation allowlist)
  ├─ llm.test.ts       # LLM chain test (npm run test:llm)
  ├─ export.ts         # document export (docx / print HTML)
  ├─ compliance.ts     # compliance engine (no source no draft / review hard-block / version trail)
  └─ seed.ts           # seed data (demo tenant/accounts/standard library)
data/                   # runtime SQLite DB (auto-generated, not in repo)
.github/workflows/     # CI (typecheck + LLM test + build + smoke)
```
