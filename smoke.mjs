// 端到端冒烟测试：验证 生成 -> 规范溯源 -> 人工复核强制节点 -> 版本留痕
const BASE = 'http://localhost:8787';
const j = async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) });
async function call(method, path, token, body) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const r = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  return j(r);
}
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

const health = await call('GET', '/api/health');
ok(health.status === 200, 'health 健康');

const adminLogin = await call('POST', '/api/auth/login', null, { email: 'admin@demo.com', password: 'admin123' });
ok(adminLogin.status === 200 && adminLogin.body.token, '管理员登录');
const A = adminLogin.body.token;

const kb = await call('GET', '/api/knowledge', A);
ok(kb.body.length === 6, `知识库 6 条 (实际 ${kb.body.length})`);

// 生成投标初稿
const gen = await call('POST', '/api/generate', A, {
  module: 'bid',
  params: { projectName: '滨海数据中心一期', tenderName: '城投集团', bidSection: '施工总承包', budget: '约3.2亿', deadline: '2026-09-01' },
});
ok(gen.status === 201, '生成投标初稿 201');
const docId = gen.body.document.id;
const v1 = gen.body.version;
ok(v1.sections.every((s) => s.citations.length > 0), '每个章节均带规范引用（合规溯源）');
ok(v1.riskFindings.length > 0, `含废标风险自检 ${v1.riskFindings.length} 项`);
ok(gen.body.document.status === 'draft', '初始状态为草稿');

// 成员尝试复核 -> 应被 403 拦截（强制复核节点 + 角色门禁）
const memberLogin = await call('POST', '/api/auth/login', null, { email: 'member@demo.com', password: 'member123' });
const M = memberLogin.body.token;
const memberReview = await call('POST', `/api/documents/${docId}/review`, M, { decision: 'approved', comment: '想越权' });
ok(memberReview.status === 403, `成员越权复核被拦截 403 (实际 ${memberReview.status})`);

// 管理员复核通过
const adminReview = await call('POST', `/api/documents/${docId}/review`, A, { decision: 'approved', comment: '内容合规，准予通过' });
ok(adminReview.status === 200 && adminReview.body.document.status === 'approved', '管理员复核通过 -> 终稿');

// 详情：含版本与复核记录
const detail = await call('GET', `/api/documents/${docId}`, A);
ok(detail.body.document.status === 'approved', '文档详情状态为 approved');
ok(detail.body.review && detail.body.review.decision === 'approved', '详情含复核记录');

// 新版本生成（版本留痕）
const newVer = await call('POST', `/api/documents/${docId}/versions`, A, { params: { projectName: '滨海数据中心一期(修订)' } });
ok(newVer.status === 201 && newVer.body.version.versionNo === 2, '生成新版本 v2（版本留痕）');
ok(newVer.body.document.status === 'draft', '新版本后回到草稿，需重新复核');

// 统计
const stats = await call('GET', '/api/stats', A);
ok(stats.body.totalDocs >= 1, `统计文档数 ${stats.body.totalDocs}`);

console.log(`\n结果: 通过 ${pass} / 失败 ${fail}`);
process.exit(fail ? 1 : 0);
