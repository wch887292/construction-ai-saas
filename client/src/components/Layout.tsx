import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, clearToken } from '../api';

const NAV = [
  { to: '/', label: '仪表盘', end: true, icon: '📊' },
  { to: '/knowledge', label: '合规知识库', icon: '📚' },
  { to: '/generate', label: 'AI 生成', icon: '✨' },
  { to: '/documents', label: '文档与复核', icon: '📝' },
];

export default function Layout() {
  const nav = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      nav('/login');
    });
  }, [nav]);

  const logout = () => {
    clearToken();
    nav('/login');
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-brand-700 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-lg font-bold tracking-wide">建筑工程AI</div>
          <div className="text-xs text-brand-100/80">轻量化合规提效 SaaS</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm ${isActive ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'}`
              }
            >
              <span>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-[11px] leading-relaxed text-brand-100/70">
          晋江市飞虹智科技企业管理有限公司
          <br />
          飞扬企源研发中心 · 负责人：吴赐虹
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b flex items-center justify-between px-6">
          <div className="text-sm text-slate-500">让工程标书、方案、资料「一键出稿、合规可查、零废标风险」</div>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <span className="text-slate-600">
                {user.name}
                <span className="ml-1 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                  {user.role === 'admin' ? '管理员' : user.role === 'reviewer' ? '复核员' : '成员'}
                </span>
              </span>
            )}
            <button onClick={logout} className="text-slate-400 hover:text-slate-700">
              退出
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
