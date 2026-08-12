// 前端 API 客户端
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
const TOKEN_KEY = 'cai_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function req(method: string, url: string, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const r = await fetch(`/api${url}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({ error: '响应解析失败' }));
  if (!r.ok) {
    if (r.status === 401) clearToken();
    throw new Error(data.error || `请求失败 (${r.status})`);
  }
  return data;
}

export const api = {
  login: (email: string, password: string) => req('POST', '/auth/login', { email, password }),
  me: () => req('GET', '/auth/me'),
  tenant: () => req('GET', '/tenant'),
  stats: () => req('GET', '/stats'),
  knowledge: () => req('GET', '/knowledge'),
  searchKnowledge: (q: string) => req('GET', `/knowledge/search?q=${encodeURIComponent(q)}`),
  addKnowledge: (k: any) => req('POST', '/knowledge', k),
  delKnowledge: (id: string) => req('DELETE', `/knowledge/${id}`),
  generate: (module: string, title: string, params: Record<string, string>) =>
    req('POST', '/generate', { module, title, params }),
  documents: (module?: string) => req('GET', `/documents${module ? `?module=${module}` : ''}`),
  document: (id: string) => req('GET', `/documents/${id}`),
  newVersion: (id: string, params: Record<string, string>) =>
    req('POST', `/documents/${id}/versions`, { params }),
  review: (id: string, decision: string, comment: string, versionNo?: number) =>
    req('POST', `/documents/${id}/review`, { decision, comment, versionNo }),
  restore: (id: string, no: number) => req('POST', `/documents/${id}/versions/${no}/restore`),
  versions: (id: string) => req('GET', `/documents/${id}/versions`),
  version: (id: string, no: number) => req('GET', `/documents/${id}/versions/${no}`),
  /** 导出文档：docx 返回文件流，pdf 返回打印友好 HTML（前端 window.print 另存 PDF） */
  exportDoc: (id: string, format: 'docx' | 'pdf') => {
    const t = getToken();
    return fetch(`/api/documents/${id}/export?format=${format}`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    });
  },
};
