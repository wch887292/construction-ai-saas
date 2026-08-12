// 服务入口 - Express 托管 API 与构建后的前端
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerRoutes } from './routes.js';
import { getProvider } from './ai.js';
import { rebuildKnowledgeFTS } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 轻量 .env 加载（进程已有环境变量优先，不覆盖）。生产可用 --env-file 或真实环境变量替代。
loadDotEnv();

function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

const DIST_DIR = path.resolve(__dirname, '../../dist');
const PORT = Number(process.env.PORT) || 8787;

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, product: '建筑工程AI SaaS' }));
rebuildKnowledgeFTS(); // 启动时重建知识库全文检索索引（FTS5）
registerRoutes(app);

// 静态托管前端（生产构建）
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[建筑工程AI] 服务已启动: http://localhost:${PORT}`);
  console.log(`[建筑工程AI] AI Provider: ${getProvider().name}（AI_PROVIDER=${process.env.AI_PROVIDER || 'mock'}，llm 需配置 LLM_API_KEY）`);
});
