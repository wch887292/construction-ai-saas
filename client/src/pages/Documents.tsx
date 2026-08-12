import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { MODULE_ORDER, MODULE_SCHEMAS } from '../schema';

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿/待复核', cls: 'bg-slate-100 text-slate-600' },
  pending_review: { label: '复核中', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '已通过(终稿)', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已退回', cls: 'bg-red-100 text-red-700' },
};

export default function Documents() {
  const [module, setModule] = useState('');
  const [list, setList] = useState<any[]>([]);

  const load = () => api.documents(module || undefined).then(setList).catch(() => {});
  useEffect(() => { load(); }, [module]);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">文档与复核</h1>
        <Link to="/generate" className="text-sm text-brand-600">
          新建生成 →
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setModule('')} className={`px-3 py-1.5 rounded-full text-sm border ${module === '' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white'}`}>
          全部
        </button>
        {MODULE_ORDER.map((m) => (
          <button key={m} onClick={() => setModule(m)} className={`px-3 py-1.5 rounded-full text-sm border ${module === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white'}`}>
            {MODULE_SCHEMAS[m].label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((d) => (
          <Link key={d.id} to={`/documents/${d.id}`} className="block p-3 rounded-lg border bg-white hover:border-brand-500">
            <div className="flex justify-between items-center">
              <div className="font-medium">{d.title}</div>
              <span className={`text-xs px-2 py-0.5 rounded ${STATUS[d.status]?.cls}`}>{STATUS[d.status]?.label}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {MODULE_SCHEMAS[d.module]?.label} · 当前版本 v{d.currentVersion} · 更新 {new Date(d.updatedAt).toLocaleString('zh-CN')}
            </div>
          </Link>
        ))}
        {list.length === 0 && <div className="text-sm text-slate-400">暂无文档，去「AI 生成」创建一份吧。</div>}
      </div>
    </div>
  );
}
