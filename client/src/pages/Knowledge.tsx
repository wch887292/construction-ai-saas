import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Knowledge() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState({ title: '', category: '规范', code: '', source: '国标', content: '' });
  const [err, setErr] = useState('');

  const load = () => api.knowledge().then(setList).catch(() => {});
  useEffect(() => { load(); }, []);

  // 全文检索（FTS5 + bm25 相关性排序）：输入关键词即搜，清空回到全量列表
  const doSearch = async (kw: string) => {
    setQ(kw);
    if (!kw.trim()) return load();
    try {
      setList(await api.searchKnowledge(kw));
    } catch {
      load();
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await api.addKnowledge(form);
      setForm({ title: '', category: '规范', code: '', source: '国标', content: '' });
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const del = async (id: string) => {
    if (!confirm('确认删除该知识条目？')) return;
    await api.delKnowledge(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">合规知识库</h1>
        <input
          className="ml-auto w-72 border rounded px-3 py-2 text-sm focus:outline-brand-500"
          placeholder="全文检索：规范名 / 编号 / 关键词（如 验收、50300）"
          value={q}
          onChange={(e) => doSearch(e.target.value)}
        />
      </div>
      {q.trim() && (
        <div className="text-xs text-slate-500">
          检索「{q}」：FTS5 相关性排序，共 {list.length} 条
        </div>
      )}

      <form onSubmit={add} className="p-4 rounded-lg border bg-white grid md:grid-cols-2 gap-3">
        <Input label="标题" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="类别" value={form.category} options={['规范', '范本', '企业制度']} onChange={(v) => setForm({ ...form, category: v })} />
          <Select label="来源" value={form.source} options={['国标', '行标', '企业']} onChange={(v) => setForm({ ...form, source: v })} />
        </div>
        <Input label="标准/制度编号" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
        <div className="md:col-span-2">
          <label className="text-sm text-slate-600">内容</label>
          <textarea
            className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-brand-500"
            rows={3}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
        </div>
        {err && <div className="md:col-span-2 text-sm text-red-600">{err}</div>}
        <div className="md:col-span-2">
          <button className="bg-brand-600 text-white rounded px-4 py-2 text-sm font-semibold hover:bg-brand-700">
            添加知识条目
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {list.map((k) => (
          <div key={k.id} className="p-3 rounded-lg border bg-white flex justify-between items-start">
            <div>
              <div className="font-medium">
                {k.title} <span className="text-xs text-slate-400">[{k.code}]</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {k.category} · {k.source}
              </div>
              <div className="text-sm text-slate-600 mt-1">{k.content}</div>
            </div>
            <button onClick={() => del(k.id)} className="text-xs text-red-500 hover:underline">
              删除
            </button>
          </div>
        ))}
        {list.length === 0 && <div className="text-sm text-slate-400">暂无知识条目</div>}
      </div>
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
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <select className="mt-1 w-full border rounded px-3 py-2 text-sm bg-white focus:outline-brand-500" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
