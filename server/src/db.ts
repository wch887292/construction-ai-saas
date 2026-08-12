// 数据访问层 - 基于 Node 内置 node:sqlite（零原生依赖）
// 列名统一使用 camelCase，与 TS 接口及前端字段保持一致。
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  DocumentRow,
  DocumentVersion,
  Knowledge,
  ModuleKey,
  PlanKey,
  Review,
  Tenant,
  User,
} from './types.js';

const DB_PATH = path.resolve(process.cwd(), 'data', 'app.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

// 一次性迁移：若检测到旧 snake_case schema（如 created_at），则删表重建为 camelCase
const TABLES = ['reviews', 'documentVersions', 'documents', 'knowledge', 'users', 'tenants'];
function hasOldSchema(): boolean {
  try {
    const cols = db
      .prepare("SELECT name FROM pragma_table_info('tenants')")
      .all()
      .map((r: any) => r.name);
    return cols.length > 0 && cols.includes('created_at');
  } catch {
    return false;
  }
}
if (hasOldSchema()) {
  TABLES.forEach((t) => db.exec(`DROP TABLE IF EXISTS ${t}`));
}

db.exec(`
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL,
  seatLimit INTEGER NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS knowledge (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  code TEXT NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  tenantId TEXT NOT NULL,
  ownerId TEXT NOT NULL,
  module TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  currentVersion INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documentVersions (
  id TEXT PRIMARY KEY,
  documentId TEXT NOT NULL,
  versionNo INTEGER NOT NULL,
  sections TEXT NOT NULL,
  citedCodes TEXT NOT NULL,
  riskFindings TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  note TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  documentId TEXT NOT NULL,
  versionNo INTEGER NOT NULL,
  reviewerId TEXT NOT NULL,
  decision TEXT NOT NULL,
  comment TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`);

// ---------------- 知识库全文检索（FTS5 + 中文 bigram） ----------------
// Node 内置 SQLite 裁剪了 ngram 分词器，故采用"中文 bigram 预处理 + FTS5 倒排索引 + bm25 排序"：
// 索引与查询时都把中文切成相邻两字 token（英文/数字原样保留），
// 既支持中文检索、获得相关性排序，又比 LIKE 全表扫描快一个量级。
let FTS_AVAILABLE = false;
function cjkBigrams(text: string): string {
  const chars: string[] = [];
  for (const ch of text) {
    chars.push(/[\u4e00-\u9fff]/.test(ch) ? ch : ' ');
  }
  const segs = chars.join('').split(/\s+/).filter(Boolean);
  const grams: string[] = [];
  for (const seg of segs) {
    for (let i = 0; i < seg.length; i++) grams.push(seg.slice(i, i + 2));
  }
  const others = text.match(/[a-zA-Z0-9.\-/]+/g) ?? [];
  return [...grams, ...others].join(' ');
}

try {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(kid UNINDEXED, title, content, code)`);
  FTS_AVAILABLE = true;
} catch {
  FTS_AVAILABLE = false;
}

/** 全量重建 FTS 索引（启动时调用，保证与 knowledge 表一致） */
export function rebuildKnowledgeFTS(): void {
  if (!FTS_AVAILABLE) return;
  try {
    db.exec('DELETE FROM knowledge_fts');
    const rows = db.prepare('SELECT id, title, content, code FROM knowledge').all() as {
      id: string;
      title: string;
      content: string;
      code: string;
    }[];
    const ins = db.prepare('INSERT INTO knowledge_fts(kid, title, content, code) VALUES(?,?,?,?)');
    for (const r of rows) ins.run(r.id, cjkBigrams(r.title), cjkBigrams(r.content), cjkBigrams(r.code));
  } catch {
    // FTS 同步失败不阻塞主流程（检索自动回退 LIKE）
  }
}

/** 向 FTS 索引追加一条 */
function indexKnowledge(id: string, title: string, content: string, code: string): void {
  if (!FTS_AVAILABLE) return;
  try {
    db.prepare('INSERT INTO knowledge_fts(kid, title, content, code) VALUES(?,?,?,?)').run(
      id,
      cjkBigrams(title),
      cjkBigrams(content),
      cjkBigrams(code)
    );
  } catch {
    // ignore
  }
}

/** 从 FTS 索引删除一条 */
function unindexKnowledge(id: string): void {
  if (!FTS_AVAILABLE) return;
  try {
    db.prepare('DELETE FROM knowledge_fts WHERE kid=?').run(id);
  } catch {
    // ignore
  }
}

const now = () => new Date().toISOString();
const j = (v: unknown) => JSON.stringify(v);
const parse = <T>(s: string): T => JSON.parse(s) as T;

// ---------------- Tenant ----------------
export function createTenant(name: string, plan: PlanKey, seatLimit: number): Tenant {
  const id = randomUUID();
  db.prepare('INSERT INTO tenants (id,name,plan,seatLimit,createdAt) VALUES (?,?,?,?,?)').run(
    id,
    name,
    plan,
    seatLimit,
    now()
  );
  return getTenant(id)!;
}
export function getTenant(id: string): Tenant | undefined {
  return db.prepare('SELECT * FROM tenants WHERE id=?').get(id) as Tenant | undefined;
}
export function listTenants(): Tenant[] {
  return db.prepare('SELECT * FROM tenants ORDER BY createdAt DESC').all() as unknown as Tenant[];
}

// ---------------- User ----------------
export function createUser(
  tenantId: string,
  email: string,
  name: string,
  password: string,
  role: User['role']
): User {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO users (id,tenantId,email,name,password,role,createdAt) VALUES (?,?,?,?,?,?,?)'
  ).run(id, tenantId, email, name, password, role, now());
  return getUser(id)!;
}
export function getUser(id: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id=?').get(id) as User | undefined;
}
export function getUserByEmail(email: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE email=?').get(email) as User | undefined;
}
export function listUsers(tenantId: string): User[] {
  return db.prepare('SELECT * FROM users WHERE tenantId=? ORDER BY createdAt').all(tenantId) as unknown as User[];
}
export function countUsers(tenantId: string): number {
  return (db.prepare('SELECT COUNT(*) c FROM users WHERE tenantId=?').get(tenantId) as { c: number }).c;
}

// ---------------- Knowledge ----------------
export function createKnowledge(
  tenantId: string,
  k: Omit<Knowledge, 'id' | 'createdAt' | 'tenantId'>
): Knowledge {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO knowledge (id,tenantId,title,category,code,source,content,createdAt) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, tenantId, k.title, k.category, k.code, k.source, k.content, now());
  indexKnowledge(id, k.title, k.content, k.code);
  return getKnowledge(id)!;
}
export function getKnowledge(id: string): Knowledge | undefined {
  return db.prepare('SELECT * FROM knowledge WHERE id=?').get(id) as Knowledge | undefined;
}
export function listKnowledge(tenantId: string, category?: string): Knowledge[] {
  if (category) {
    return db
      .prepare('SELECT * FROM knowledge WHERE tenantId=? AND category=? ORDER BY code')
      .all(tenantId, category) as unknown as Knowledge[];
  }
  return db.prepare('SELECT * FROM knowledge WHERE tenantId=? ORDER BY code').all(tenantId) as unknown as Knowledge[];
}
export function deleteKnowledge(id: string): void {
  db.prepare('DELETE FROM knowledge WHERE id=?').run(id);
  unindexKnowledge(id);
}
/** 全文检索：FTS5 优先（bm25 相关性排序），FTS 不可用时回退 LIKE 关键词检索 */
export function searchKnowledge(tenantId: string, keywords: string[]): Knowledge[] {
  if (keywords.length === 0) return [];
  if (FTS_AVAILABLE) {
    try {
      const grams = keywords
        .flatMap((kw) => cjkBigrams(kw).split(/\s+/))
        .filter((g) => g.length > 0);
      if (grams.length > 0) {
        const match = grams.join(' OR ');
        return db
          .prepare(
            `SELECT k.* FROM knowledge k JOIN knowledge_fts f ON k.id = f.kid
             WHERE k.tenantId=? AND knowledge_fts MATCH ?
             ORDER BY bm25(knowledge_fts) LIMIT 20`
          )
          .all(tenantId, match) as unknown as Knowledge[];
      }
    } catch {
      // FTS 查询失败回退 LIKE
    }
  }
  const esc = (kw: string) => kw.replace(/'/g, "''");
  const like = keywords
    .map((kw) => `title LIKE '%${esc(kw)}%' OR content LIKE '%${esc(kw)}%' OR code LIKE '%${esc(kw)}%'`)
    .join(' OR ');
  const sql = `SELECT * FROM knowledge WHERE tenantId=? AND (${like}) ORDER BY code LIMIT 20`;
  return db.prepare(sql).all(tenantId) as unknown as Knowledge[];
}

// ---------------- Document ----------------
export function createDocument(
  tenantId: string,
  ownerId: string,
  module: ModuleKey,
  title: string
): DocumentRow {
  const id = randomUUID();
  const t = now();
  db.prepare(
    'INSERT INTO documents (id,tenantId,ownerId,module,title,status,currentVersion,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(id, tenantId, ownerId, module, title, 'draft', 0, t, t);
  return getDocument(id)!;
}
export function getDocument(id: string): DocumentRow | undefined {
  return db.prepare('SELECT * FROM documents WHERE id=?').get(id) as DocumentRow | undefined;
}
export function listDocuments(tenantId: string, module?: ModuleKey): DocumentRow[] {
  if (module) {
    return db
      .prepare('SELECT * FROM documents WHERE tenantId=? AND module=? ORDER BY updatedAt DESC')
      .all(tenantId, module) as unknown as DocumentRow[];
  }
  return db
    .prepare('SELECT * FROM documents WHERE tenantId=? ORDER BY updatedAt DESC')
    .all(tenantId) as unknown as DocumentRow[];
}
export function updateDocumentStatus(id: string, status: DocumentRow['status']): void {
  db.prepare('UPDATE documents SET status=?, updatedAt=? WHERE id=?').run(status, now(), id);
}
export function setCurrentVersion(id: string, version: number): void {
  db.prepare('UPDATE documents SET currentVersion=?, updatedAt=? WHERE id=?').run(version, now(), id);
}

// ---------------- Version ----------------
export function createVersion(
  documentId: string,
  versionNo: number,
  sections: DocumentVersion['sections'],
  citedCodes: string[],
  riskFindings: DocumentVersion['riskFindings'],
  createdBy: string,
  note: string
): DocumentVersion {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO documentVersions (id,documentId,versionNo,sections,citedCodes,riskFindings,createdBy,note,createdAt) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(id, documentId, versionNo, j(sections), j(citedCodes), j(riskFindings), createdBy, note, now());
  return {
    id,
    documentId,
    versionNo,
    sections,
    citedCodes,
    riskFindings,
    createdBy,
    note,
    createdAt: now(),
  };
}
export function listVersions(documentId: string): DocumentVersion[] {
  const rows = db
    .prepare('SELECT * FROM documentVersions WHERE documentId=? ORDER BY versionNo')
    .all(documentId) as unknown as (Omit<DocumentVersion, 'sections' | 'citedCodes' | 'riskFindings'> & {
    sections: string;
    citedCodes: string;
    riskFindings: string;
  })[];
  return rows.map((r) => ({
    id: r.id,
    documentId: r.documentId,
    versionNo: r.versionNo,
    sections: parse<DocumentVersion['sections']>(r.sections),
    citedCodes: parse<string[]>(r.citedCodes),
    riskFindings: parse<DocumentVersion['riskFindings']>(r.riskFindings),
    createdBy: r.createdBy,
    note: r.note,
    createdAt: r.createdAt,
  }));
}
export function getVersion(documentId: string, versionNo: number): DocumentVersion | undefined {
  return listVersions(documentId).find((v) => v.versionNo === versionNo);
}

// ---------------- Review ----------------
export function createReview(
  documentId: string,
  versionNo: number,
  reviewerId: string,
  decision: Review['decision'],
  comment: string
): Review {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO reviews (id,documentId,versionNo,reviewerId,decision,comment,createdAt) VALUES (?,?,?,?,?,?,?)'
  ).run(id, documentId, versionNo, reviewerId, decision, comment, now());
  return { id, documentId, versionNo, reviewerId, decision, comment, createdAt: now() };
}
export function getReviewForVersion(documentId: string, versionNo: number): Review | undefined {
  return db
    .prepare('SELECT * FROM reviews WHERE documentId=? AND versionNo=? ORDER BY createdAt DESC LIMIT 1')
    .get(documentId, versionNo) as Review | undefined;
}
export function listReviews(documentId: string): Review[] {
  return db.prepare('SELECT * FROM reviews WHERE documentId=? ORDER BY createdAt').all(documentId) as unknown as Review[];
}

export { randomUUID };
