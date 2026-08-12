import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { MODULE_ORDER, MODULE_SCHEMAS } from '../schema';

export default function Generate() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [module, setModule] = useState(params.get('m') || 'bid');
  const [form, setForm] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    setModule(params.get('m') || 'bid');
    setForm({});
    setTitle('');
    setResult(null);
  }, [params]);

  const schema = MODULE_SCHEMAS[module];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const missing = schema.fields.filter((f) => f.required && !form[f.key]?.trim());
    if (missing.length) {
      setErr(`请填写必填项：${missing.map((f) => f.label).join('、')}`);
      return;
    }
    setLoading(true);
    try {
      const r = await api.generate(module, title, form);
      setResult(r);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">AI 生成（初稿）</h1>

      <div className="flex gap-2 flex-wrap">
        {MODULE_ORDER.map((m) => (
          <button
            key={m}
            onClick={() => setModule(m)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              m === module ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600'
            }`}
          >
            {MODULE_SCHEMAS[m].label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={submit} className="p-4 rounded-lg border bg-white space-y-3">
          <div className="text-sm text-slate-500">{schema.desc}</div>
          <Input label="文档标题（可选，留空自动生成）" value={title} onChange={setTitle} />
          {schema.fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm text-slate-600">
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.textarea ? (
                <textarea
                  className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-brand-500"
                  rows={2}
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-brand-500"
                  placeholder={f.placeholder}
                  value={form[f.key] || ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button disabled={loading} className="w-full bg-brand-600 text-white rounded py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
            {loading ? '生成中…' : '生成初稿'}
          </button>
        </form>

        <div>
          {result ? (
            <ResultView result={result} onOpen={() => nav(`/documents/${result.document.id}`)} />
          ) : (
            <div className="p-6 rounded-lg border border-dashed text-sm text-slate-400">
              填写左侧信息后点击「生成初稿」。AI 将输出带规范引用的结构化文档，并经合规自检标记风险点。生成后请在「文档与复核」中完成人工复核。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({ result, onOpen }: { result: any; onOpen: () => void }) {
  const v = result.version;
  return (
    <div className="p-4 rounded-lg border bg-white space-y-3 max-h-[70vh] overflow-auto">
      <div className="font-semibold text-brand-700">{result.document.title}</div>
      <div className="text-xs text-slate-400">版本 v{v.versionNo} · 状态：{result.document.status} · 已引用规范 {v.citedCodes.join('、')}</div>
      {v.sections.map((s: any) => (
        <div key={s.id} className="border-t pt-2">
          <div className="font-medium text-sm">{s.heading}</div>
          <div className="text-sm text-slate-600 mt-1">{s.content}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {s.citations.map((c: any, i: number) => (
              <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title={c.title}>
                {c.code} · {c.source}
              </span>
            ))}
          </div>
        </div>
      ))}
      {v.riskFindings.length > 0 && (
        <div className="border-t pt-2">
          <div className="font-medium text-sm text-amber-700">合规/废标风险自检</div>
          {v.riskFindings.map((r: any, i: number) => (
            <div key={i} className="text-xs mt-1">
              <span className={`font-semibold ${r.level === 'high' ? 'text-red-600' : r.level === 'medium' ? 'text-amber-600' : 'text-slate-500'}`}>
                [{r.level}]
              </span>{' '}
              {r.point} → {r.suggestion}
            </div>
          ))}
        </div>
      )}
      <button onClick={onOpen} className="w-full bg-brand-600 text-white rounded py-2 text-sm font-semibold hover:bg-brand-700">
        前往合规复核台 →
      </button>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <input className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-brand-500" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
