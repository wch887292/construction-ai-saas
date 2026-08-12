// API 路由 - 鉴权 / 知识库 / 生成 / 文档 / 复核 / 版本 / 统计
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import { Express } from 'express';
import {
  countUsers,
  createDocument,
  createKnowledge,
  createReview,
  createVersion,
  deleteKnowledge,
  getDocument,
  getReviewForVersion,
  getVersion,
  getUser,
  listDocuments,
  listKnowledge,
  listReviews,
  listVersions,
  searchKnowledge,
  setCurrentVersion,
  updateDocumentStatus,
} from './db.js';
import { getProvider } from './ai.js';
import { ComplianceError, guardApproval, nextVersion, validateCitations } from './compliance.js';
import { buildDocx, buildPrintHtml, ExportData } from './export.js';
import { login, requireAuth, requireRole } from './auth.js';
import { DocStatus, MODULE_META, ModuleKey, PLAN_META } from './types.js';

const MODULES = Object.keys(MODULE_META) as ModuleKey[];
const STATUS_LABEL: Record<DocStatus, string> = {
  draft: '草稿',
  pending_review: '待复核',
  approved: '已通过（终稿）',
  rejected: '已驳回',
};

export function registerRoutes(app: Express) {
  // ---------- 鉴权 ----------
  app.post('/api/auth/login', login);
  app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

  app.get('/api/tenant', requireAuth, (req, res) => {
    const u = req.user!;
    const seatsUsed = countUsers(u.tenantId);
    res.json({
      tenantId: u.tenantId,
      user: u,
      seatsUsed,
      planMeta: PLAN_META,
    });
  });

  // ---------- 知识库（合规溯源素材） ----------
  app.get('/api/knowledge', requireAuth, (req, res) => {
    const category = req.query.category ? String(req.query.category) : undefined;
    res.json(listKnowledge(req.user!.tenantId, category));
  });

  // 知识库全文检索（FTS5 + bm25 相关性排序，与 AI 生成召回规范同源）
  app.get('/api/knowledge/search', requireAuth, (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);
    res.json(searchKnowledge(req.user!.tenantId, [q]));
  });

  app.post('/api/knowledge', requireAuth, (req, res) => {
    const { title, category, code, source, content } = req.body ?? {};
    if (!title || !category || !code || !source || !content) {
      return res.status(400).json({ error: '标题/类别/编号/来源/内容 均必填' });
    }
    const k = createKnowledge(req.user!.tenantId, { title, category, code, source, content });
    res.status(201).json(k);
  });

  app.delete('/api/knowledge/:id', requireAuth, (req, res) => {
    const k = listKnowledge(req.user!.tenantId).find((x) => x.id === req.params.id);
    if (!k) return res.status(404).json({ error: '未找到或无权删除' });
    deleteKnowledge(req.params.id);
    res.json({ ok: true });
  });

  // ---------- 生成（四大模块，AI 仅出初稿） ----------
  app.post('/api/generate', requireAuth, async (req, res) => {
    const { module, title, params } = req.body ?? {};
    if (!module || !MODULES.includes(module)) {
      return res.status(400).json({ error: 'module 不合法，应为 bid/plan/disclosure/log' });
    }
    try {
      const doc = await getProvider().generate({ module, tenantId: req.user!.tenantId, params: params ?? {} });
      const check = validateCitations(doc.sections);
      if (!check.ok) {
        return res.status(422).json({ error: '合规校验未通过：以下章节缺少规范引用', missing: check.missingHeadings });
      }
      const row = createDocument(req.user!.tenantId, req.user!.id, module, title || doc.title);
      const citedCodes = Array.from(new Set(doc.sections.flatMap((s) => s.citations.map((c) => c.code))));
      const version = createVersion(
        row.id,
        1,
        doc.sections,
        citedCodes,
        doc.riskFindings,
        req.user!.id,
        'AI 初稿'
      );
      setCurrentVersion(row.id, 1);
      res.status(201).json({ document: row, version });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  // ---------- 文档 ----------
  app.get('/api/documents', requireAuth, (req, res) => {
    const module = req.query.module ? (String(req.query.module) as ModuleKey) : undefined;
    res.json(listDocuments(req.user!.tenantId, module));
  });

  app.get('/api/documents/:id', requireAuth, (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc || doc.tenantId !== req.user!.tenantId) return res.status(404).json({ error: '未找到' });
    const versions = listVersions(doc.id);
    const current = getVersion(doc.id, doc.currentVersion);
    const review = getReviewForVersion(doc.id, doc.currentVersion);
    res.json({ document: doc, versions: versions.map((v) => ({ ...v, sections: undefined })), current, review });
  });

  // 基于新参数生成新版本（版本留痕）
  app.post('/api/documents/:id/versions', requireAuth, async (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc || doc.tenantId !== req.user!.tenantId) return res.status(404).json({ error: '未找到' });
    try {
      const gen = await getProvider().generate({ module: doc.module, tenantId: doc.tenantId, params: req.body?.params ?? {} });
      const vno = nextVersion(doc.currentVersion);
      const citedCodes = Array.from(new Set(gen.sections.flatMap((s) => s.citations.map((c) => c.code))));
      const version = createVersion(doc.id, vno, gen.sections, citedCodes, gen.riskFindings, req.user!.id, 'AI 重新生成');
      setCurrentVersion(doc.id, vno);
      updateDocumentStatus(doc.id, 'draft');
      res.status(201).json({ version, document: getDocument(doc.id) });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // 人工复核（强制节点：通过后才能成为终稿）
  app.post('/api/documents/:id/review', requireAuth, requireRole('reviewer', 'admin'), (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc || doc.tenantId !== req.user!.tenantId) return res.status(404).json({ error: '未找到' });
    const { decision, comment } = req.body ?? {};
    if (decision !== 'approved' && decision !== 'rejected') {
      return res.status(400).json({ error: 'decision 必须为 approved / rejected' });
    }
    const vno = req.body?.versionNo ?? doc.currentVersion;
    const review = createReview(doc.id, vno, req.user!.id, decision, comment ?? '');
    try {
      if (decision === 'approved') {
        guardApproval(review); // 复核通过 -> 放行
        updateDocumentStatus(doc.id, 'approved');
      } else {
        updateDocumentStatus(doc.id, 'rejected');
      }
    } catch (e) {
      if (e instanceof ComplianceError) return res.status(409).json({ error: e.message, review });
      throw e;
    }
    res.json({ review, document: getDocument(doc.id) });
  });

  // 版本回看（版本留痕：可回到任一历史版本）
  app.post('/api/documents/:id/versions/:no/restore', requireAuth, (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc || doc.tenantId !== req.user!.tenantId) return res.status(404).json({ error: '未找到' });
    const no = Number(req.params.no);
    if (!getVersion(doc.id, no)) return res.status(404).json({ error: '版本不存在' });
    setCurrentVersion(doc.id, no);
    updateDocumentStatus(doc.id, 'draft');
    res.json({ document: getDocument(doc.id) });
  });

  app.get('/api/documents/:id/versions', requireAuth, (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc || doc.tenantId !== req.user!.tenantId) return res.status(404).json({ error: '未找到' });
    res.json(listVersions(doc.id));
  });

  app.get('/api/documents/:id/versions/:no', requireAuth, (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc || doc.tenantId !== req.user!.tenantId) return res.status(404).json({ error: '未找到' });
    const v = getVersion(doc.id, Number(req.params.no));
    if (!v) return res.status(404).json({ error: '版本不存在' });
    res.json(v);
  });

  // 文档导出：format=docx（下载 Word）| format=pdf（打印视图，前端 window.print 另存 PDF）
  app.get('/api/documents/:id/export', requireAuth, async (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc || doc.tenantId !== req.user!.tenantId) return res.status(404).json({ error: '未找到' });
    const version = getVersion(doc.id, doc.currentVersion);
    if (!version) return res.status(404).json({ error: '版本不存在' });
    const format = String(req.query.format ?? 'docx') === 'pdf' ? 'pdf' : 'docx';
    const creator = getUser(version.createdBy);
    const kb = listKnowledge(req.user!.tenantId);
    const data: ExportData = {
      title: doc.title,
      moduleLabel: MODULE_META[doc.module].label,
      statusLabel: STATUS_LABEL[doc.status],
      versionNo: version.versionNo,
      sections: version.sections,
      riskFindings: version.riskFindings,
      citedCodes: version.citedCodes,
      citedKnowledge: kb.filter((k) => version.citedCodes.includes(k.code)),
      createdByName: creator?.name ?? '未知用户',
      createdAt: version.createdAt,
      updatedAt: doc.updatedAt,
    };
    try {
      if (format === 'pdf') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(buildPrintHtml(data));
      } else {
        const buf = await buildDocx(data);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename*=UTF-8''${encodeURIComponent(doc.title)}.docx`
        );
        res.send(buf);
      }
    } catch (e) {
      res.status(500).json({ error: `导出失败：${e instanceof Error ? e.message : String(e)}` });
    }
  });

  // 复核记录
  app.get('/api/documents/:id/reviews', requireAuth, (req, res) => {
    const doc = getDocument(req.params.id);
    if (!doc || doc.tenantId !== req.user!.tenantId) return res.status(404).json({ error: '未找到' });
    res.json(listReviews(doc.id));
  });

  // ---------- 统计 ----------
  app.get('/api/stats', requireAuth, (req, res) => {
    const docs = listDocuments(req.user!.tenantId);
    const approved = docs.filter((d) => d.status === 'approved').length;
    const pending = docs.filter((d) => d.status === 'draft' || d.status === 'pending_review').length;
    const kb = listKnowledge(req.user!.tenantId);
    const rate = docs.length ? Math.round((approved / docs.length) * 100) : 0;
    res.json({
      totalDocs: docs.length,
      approved,
      pending,
      knowledgeCount: kb.length,
      complianceRate: rate,
    });
  });
}
