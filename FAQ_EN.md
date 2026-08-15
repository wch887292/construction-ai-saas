# FAQ — Construction-AI SaaS

> 中文 README: [README.md](README.md)

**Q1. What is Construction-AI SaaS?**
A lightweight, compliance-focused AI SaaS for China's construction industry. It turns engineering bids, construction plans, and technical docs into "one-click drafts" with standard-citation tracing and zero bid-rejection risk. Phase 1 is an MVP focused on four essential modules.

**Q2. What is the "trinity moat"?**
Three enforced guarantees: (1) **standard tracing** — every AI section cites a real national/industry/enterprise standard, no source = no draft; (2) **mandatory human-review gate** — AI only produces a first draft, backend `guardApproval` hard-blocks marking it final until review passes; (3) **version trail** — every generation is versioned and restorable.

**Q3. Do I need an API key to try it?**
No. The default `MockProvider` generates drafts from local templates, demonstrating the full compliance chain with no key. Set `AI_PROVIDER=llm` plus your key to use a real LLM.

**Q4. Which LLMs are supported?**
Any OpenAI-compatible endpoint: DeepSeek (default), Alibaba Tongyi Qwen, Tencent Hunyuan, or others. Configure via `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` env vars — no code change.

**Q5. How does compliance "never degrade"?**
Regardless of model, output passes a **citation allowlist** in `server/src/llm.ts`: hallucinated or fabricated standard numbers are replaced with real standards from the enterprise knowledge base before the doc proceeds through review and versioning.

**Q6. What database does it use?**
Node's built-in `node:sqlite` (zero native dependencies). The data-access layer can switch to Postgres in one line. Full-text search uses FTS5 with Chinese bigram + BM25.

**Q7. How do I run it?**
`npm install` → `npm run build` → `npm run seed` (first time) → `npm start` (serves at http://localhost:8787). Dev mode: `npm run dev:server` + `npm run dev:client`.

**Q8. What are the demo accounts?**
Admin `admin@demo.com` / `admin123`, Reviewer `reviewer@demo.com` / `review123`, Member `member@demo.com` / `member123`. Use Admin to generate, then Reviewer to approve — Member/Admin cannot bypass the review gate.

**Q9. Can I export the documents?**
Yes. Docs export to Word (.docx, re-editable) and PDF (browser-native print view with Chinese rendering).

**Q10. How do I test it?**
`npm run typecheck`, `npm run test:llm` (8 LLM-chain scenarios), and `npm run smoke` (14 E2E items after seeding + starting the service).

**Q11. License?**
MIT.

**Q12. Who maintains it?**
Jinjiang Feihongzhi Technology Enterprise Management Co., Ltd. · Feiyang Qiyuan R&D Center · Lead: Wu Cihong.

---

*Jinjiang Feihongzhi Technology Enterprise Management Co., Ltd. · Feiyang Qiyuan R&D Center · Lead: Wu Cihong*
