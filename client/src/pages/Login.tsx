import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('admin123');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      nav('/');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-700">
      <div className="w-96 bg-white rounded-xl shadow-lg p-8">
        <div className="mb-6">
          <div className="text-2xl font-bold text-brand-700">建筑工程AI</div>
          <div className="text-sm text-slate-500">轻量化合规提效 AI SaaS 平台</div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">邮箱</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-brand-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-slate-600">密码</label>
            <input
              type="password"
              className="mt-1 w-full border rounded px-3 py-2 text-sm focus:outline-brand-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? '登录中…' : '登录'}
          </button>
        </form>
        <div className="mt-5 text-xs text-slate-400 leading-relaxed">
          演示账号：<br />
          管理员 admin@demo.com / admin123<br />
          复核员 reviewer@demo.com / review123<br />
          成员 member@demo.com / member123
        </div>
      </div>
    </div>
  );
}
