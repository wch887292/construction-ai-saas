import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { MODULE_SCHEMAS } from '../schema';

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿/待复核', cls: 'bg-slate-100 text-slate-600' },
  pending_review: { label: '复核中', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '已通过(终稿)', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已退回', cls: 'bg-red-100 text-red-700' },
};

export default function DocumentDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState<any>(null);
  const [role, setRole] = useState('');
  const [viewing, setViewing] = useState<any>(null); // 正在查看的版本（含 sections）
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api.document(id!).then((d) => { setDetail(d); setViewing(d.current); }).catch(() => {});
  useEffect(() => { load(); api.me().then((u) => setRole(u.role)).catch(() => {}); }, [id]);

  const current = detail?.current;
  const canReview = (role === 'reviewer' || role === 'admin') && detail?.document?.status !== 'approved';

  const review = async (decision: string) => {
    setErr('');
    try {
      await api.review(id!, decision, comment, detail.document.currentVersion);
      setMsg(decision === 'approved' ? '✅ 已通过复核，文档标记为终稿。' : '↩️ 已退回，请修改后重新提交。');
      setComment('');
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const viewVersion = async (no: number) => {
    const v = await api.version(id!, no);
    setViewing(v);
  };

  const restore = async (no: number) => {
    await api.restore(id!, no);
    setMsg(`已恢复至版本 v${no}（状态置为草稿，需重新复核）。`);
    load();
  };

  // 导出 Word（.docx 下载）/ PDF（打印视图，浏览器另存为 PDF）
  const exportDoc = async (format: 'docx' | 'pdf') => {
    try {
      const resp = await api.exportDoc(id!, format);
      if (!resp.ok) throw new Error(`导出失败 (${resp.status})`);
      const fileName = `${detail?.document?.title ?? 'document'}`;
      if (format === 'docx') {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const html = await resp.text();
        const w = window.open('', '_blank');
        if (!w) return alert('浏览器拦截了新窗口，请允许弹窗后重试');
        w.document.write(html);
        w.document.close();
      }
    } catch (e: any) {
      alert(e.message || '导出失败');
    }
  };

  if (!detail) return <div className="text-slate-400">加载中…</div>;

  const doc = detail.document;
  const shown = viewing || current;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold">{doc.title}</h1>
          <div className="text-xs text-slate-500 mt-1">
            {MODULE_SCHEMAS[doc.module]?.label} · 当前版本 v{doc.currentVersion}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportDoc('docx')}
            className="text-xs px-3 py-1.5 rounded border border-brand-600 text-brand-700 bg-white hover:bg-brand-50 font-medium"
          >
            ⬇ 导出 Word
          </button>
          <button
            onClick={() => exportDoc('pdf')}
            className="text-xs px-3 py-1.5 rounded border border-red-500 text-red-600 bg-white hover:bg-red-50 font-medium"
          >
            🖨 导出 PDF
          </button>
          <span className={`text-xs px-2 py-1 rounded ${STATUS[doc.status]?.cls}`}>{STATUS[doc.status]?.label}</span>
        </div>
      </div>

      {/* 合规护栏提示 */}
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
        🛡️ 合规护栏：AI 仅输出初稿，终稿须经人工复核节点通过后方可生效；每条内容均已绑定规范来源（见下方引用徽标）。
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* 文档内容 + 溯源 */}
        <div className="md:col-span-2 p-4 rounded-lg border bg-white space-y-3 max-h-[70vh] overflow-auto">
          <div className="font-semibold">
            版本 v{shown.versionNo} {viewing && viewing.versionNo !== doc.currentVersion && <span className="text-xs text-slate-400">（历史查看）</span>}
          </div>
          <div className="text-xs text-slate-400">引用规范：{shown.citedCodes.join('、') || '—'}</div>
          {shown.sections.map((s: any) => (
            <div key={s.id} className="border-t pt-2">
              <div className="font-medium text-sm">{s.heading}</div>
              <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{s.content}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {s.citations.map((c: any, i: number) => (
                  <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title={c.title}>
                    {c.code} · {c.source}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {shown.riskFindings?.length > 0 && (
            <div className="border-t pt-2">
              <div className="font-medium text-sm text-amber-700">合规/废标风险自检</div>
              {shown.riskFindings.map((r: any, i: number) => (
                <div key={i} className="text-xs mt-1">
                  <span className={`font-semibold ${r.level === 'high' ? 'text-red-600' : r.level === 'medium' ? 'text-amber-600' : 'text-slate-500'}`}>[{r.level}]</span>{' '}
                  {r.point} → {r.suggestion}
                </div>
              ))}
            </div>
          )}
          {viewing && viewing.versionNo !== doc.currentVersion && (
            <button onClick={() => restore(viewing.versionNo)} className="w-full border border-brand-500 text-brand-600 rounded py-2 text-sm hover:bg-brand-50">
              恢复此版本为当前（版本留痕）
            </button>
          )}
        </div>

        {/* 复核台 + 版本留痕 */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg border bg-white">
            <div className="font-semibold mb-2">人工复核（强制节点）</div>
            {doc.status === 'approved' ? (
              <div className="text-sm text-emerald-700">
                ✅ 已通过复核，可作为终稿交付。
                {detail.review && <div className="text-xs text-slate-500 mt-1">复核意见：{detail.review.comment || '（无）'}</div>}
              </div>
            ) : canReview ? (
              <div className="space-y-2">
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-brand-500"
                  rows={3}
                  placeholder="复核意见（可选）"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                {err && <div className="text-xs text-red-600">{err}</div>}
                <div className="flex gap-2">
                  <button onClick={() => review('approved')} className="flex-1 bg-emerald-600 text-white rounded py-2 text-sm font-semibold hover:bg-emerald-700">
                    通过
                  </button>
                  <button onClick={() => review('rejected')} className="flex-1 bg-red-500 text-white rounded py-2 text-sm font-semibold hover:bg-red-600">
                    退回
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">{role ? '当前账号无复核权限（需复核员/管理员）。' : '加载中…'}</div>
            )}
            {msg && <div className="text-xs text-brand-600 mt-2">{msg}</div>}
          </div>

          <div className="p-4 rounded-lg border bg-white">
            <div className="font-semibold mb-2">版本留痕</div>
            <div className="space-y-1 max-h-60 overflow-auto">
              {detail.versions.map((v: any) => (
                <button
                  key={v.versionNo}
                  onClick={() => viewVersion(v.versionNo)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded border ${v.versionNo === doc.currentVersion ? 'bg-brand-50 border-brand-300' : 'hover:bg-slate-50'}`}
                >
                  v{v.versionNo} · {v.note} · {new Date(v.createdAt).toLocaleString('zh-CN')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
