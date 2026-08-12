// 合规核心引擎 - 三位一体：规范溯源 + 人工复核强制节点 + 版本留痕
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import { Review, Section } from './types.js';

/**
 * 支柱一：规范溯源
 * 校验 AI 生成的每个章节是否都绑定了规范/标准引用。
 * 工程标书、方案一旦出错会导致废标、停工、行政处罚，因此"无来源不出稿"。
 */
export function validateCitations(sections: Section[]): { ok: boolean; missingHeadings: string[] } {
  const missingHeadings = sections
    .filter((s) => !s.citations || s.citations.length === 0)
    .map((s) => s.heading);
  return { ok: missingHeadings.length === 0, missingHeadings };
}

/** 从知识库召回的规范中构造引用对象 */
export function toCitation(k: { code: string; title: string; source: string }) {
  return { code: k.code, title: k.title, source: k.source };
}

/**
 * 支柱二：人工复核强制节点
 * AI 只出初稿，文档状态置为 approved（终稿）前，必须存在对当前版本"通过"的复核记录。
 */
export function isVersionApproved(review?: Review): boolean {
  return !!review && review.decision === 'approved';
}

export class ComplianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComplianceError';
  }
}

/**
 * 终稿放行守卫：未通过人工复核不得标记为 approved。
 * 这是产品可商业化的核心壁垒，而非加分项。
 */
export function guardApproval(review: Review | undefined): void {
  if (!isVersionApproved(review)) {
    throw new ComplianceError('合规拦截：当前版本未经人工复核通过，不能标记为终稿。');
  }
}

/**
 * 支柱三：版本留痕
 * 计算下一版本号，保证每次修订可回看、可对比。
 */
export function nextVersion(current: number): number {
  return current + 1;
}
