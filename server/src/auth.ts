// 鉴权 - 演示用轻量会话（内存 token）。生产应替换为 JWT + 密码哈希。
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import { Request, Response, NextFunction } from 'express';
import { getUserByEmail, getUser } from './db.js';
import { User } from './types.js';

const tokens = new Map<string, string>(); // token -> userId

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: '缺少邮箱或密码' });
  const user = getUserByEmail(String(email));
  if (!user || user.password !== String(password)) {
    return res.status(401).json({ error: '邮箱或密码错误' });
  }
  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64url');
  tokens.set(token, user.id);
  return res.json({ token, user });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const userId = token ? tokens.get(token) : undefined;
  if (!userId) return res.status(401).json({ error: '未登录或会话失效' });
  const user = getUser(userId);
  if (!user) return res.status(401).json({ error: '用户不存在' });
  req.user = user;
  next();
}

export function requireRole(...roles: User['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: '未登录' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足：需复核人/管理员角色' });
    }
    next();
  };
}
