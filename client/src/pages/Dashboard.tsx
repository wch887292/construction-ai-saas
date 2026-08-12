import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { MODULE_ORDER, MODULE_SCHEMAS } from '../schema';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [kb, setKb] = useState<any[]>([]);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.knowledge().then(setKb).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">仪表盘</h1>
        <p className="text-sm text-slate-500">
          核心壁垒：合规溯源 · 人工复核 · 版本留痕 —— AI 仅出初稿，终稿必经人工复核。
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="文档总数" value={stats?.totalDocs} />
        <Stat label="已复核通过" value={stats?.approved} />
        <Stat label="待处理" value={stats?.pending} />
        <Stat label="合规率" value={stats ? `${stats.complianceRate}%` : '-'} />
      </div>

      <div>
        <h2 className="font-semibold mb-3">四大刚需模块（一期 MVP）</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {MODULE_ORDER.map((m) => {
            const s = MODULE_SCHEMAS[m];
            return (
              <Link
                key={m}
                to={`/generate?m=${m}`}
                className="block p-4 rounded-lg border bg-white hover:border-brand-500 hover:shadow transition"
              >
                <div className="font-semibold text-brand-700">{s.label}</div>
                <div className="text-sm text-slate-500 mt-1">{s.desc}</div>
                <div className="text-xs text-brand-600 mt-3">去生成 →</div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-lg border bg-white">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">合规知识库</h2>
          <Link to="/knowledge" className="text-sm text-brand-600">
            管理 →
          </Link>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          已沉淀 {kb.length} 条规范 / 范本 / 企业制度，AI 生成时逐条溯源引用。
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number | string }) {
  return (
    <div className="p-4 rounded-lg border bg-white">
      <div className="text-2xl font-bold text-brand-700">{value ?? '-'}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}
