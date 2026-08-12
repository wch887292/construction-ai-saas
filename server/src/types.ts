// 建筑工程AI SaaS - 领域类型定义
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹

export type PlanKey = 'basic' | 'pro' | 'enterprise';

export type ModuleKey = 'bid' | 'plan' | 'disclosure' | 'log';

export type DocStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export type ReviewDecision = 'approved' | 'rejected';

export type RiskLevel = 'high' | 'medium' | 'low';

/** 规范/标准引用（合规溯源的最小单元） */
export interface Citation {
  code: string; // 标准编号，如 GB 50300-2013
  title: string; // 标准名称
  source: string; // 来源类别：国标 / 行标 / 企业制度
}

/** 文档章节（AI 仅生成初稿，每条内容绑定规范引用） */
export interface Section {
  id: string;
  heading: string;
  content: string;
  citations: Citation[];
}

/** 风险自检发现项 */
export interface RiskFinding {
  level: RiskLevel;
  point: string;
  suggestion: string;
}

/** AI 生成的文档草稿 */
export interface GeneratedDoc {
  title: string;
  sections: Section[];
  riskFindings: RiskFinding[];
}

export interface Tenant {
  id: string;
  name: string;
  plan: PlanKey;
  seatLimit: number;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  password: string; // 演示用明文，生产需哈希
  role: 'admin' | 'member' | 'reviewer';
  createdAt: string;
}

export interface Knowledge {
  id: string;
  tenantId: string;
  title: string;
  category: '规范' | '范本' | '企业制度';
  code: string; // 标准编号或企业制度编号
  source: string; // 国标 / 行标 / 企业
  content: string;
  createdAt: string;
}

export interface DocumentRow {
  id: string;
  tenantId: string;
  ownerId: string;
  module: ModuleKey;
  title: string;
  status: DocStatus;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNo: number;
  sections: Section[];
  citedCodes: string[];
  riskFindings: RiskFinding[];
  createdBy: string;
  note: string;
  createdAt: string;
}

export interface Review {
  id: string;
  documentId: string;
  versionNo: number;
  reviewerId: string;
  decision: ReviewDecision;
  comment: string;
  createdAt: string;
}

export const MODULE_META: Record<ModuleKey, { label: string; desc: string }> = {
  bid: { label: '投标AI助手', desc: '招标文件解析 · 标书初稿 · 废标风险自检' },
  plan: { label: '施工方案AI助手', desc: '专项方案生成 · 危大风险识别 · 合规自检' },
  disclosure: { label: '技术交底生成助手', desc: '高频轻量化技术交底自动生成' },
  log: { label: '施工日志/周报生成', desc: '全员高频日志与周报自动生成' },
};

export const PLAN_META: Record<PlanKey, { label: string; price: number; seats: number }> = {
  basic: { label: '基础版', price: 9800, seats: 5 },
  pro: { label: '专业版', price: 19800, seats: 15 },
  enterprise: { label: '企业版', price: 39800, seats: 30 },
};
