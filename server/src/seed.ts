// 种子数据 - 演示租户 / 账号 / 工程规范库
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import { createKnowledge, createTenant, createUser, listTenants } from './db.js';
import { PLAN_META } from './types.js';

function seed() {
  if (listTenants().length > 0) {
    console.log('[seed] 已存在租户，跳过种子写入。');
    return;
  }
  const tenant = createTenant('飞扬建工（演示租户）', 'pro', PLAN_META.pro.seats);
  console.log(`[seed] 租户: ${tenant.name} (${tenant.id})`);

  createUser(tenant.id, 'admin@demo.com', '管理员', 'admin123', 'admin');
  createUser(tenant.id, 'reviewer@demo.com', '合规复核员', 'review123', 'reviewer');
  createUser(tenant.id, 'member@demo.com', '业务成员', 'member123', 'member');

  const kb = [
    { title: '建筑工程施工质量验收统一标准', category: '规范' as const, code: 'GB 50300-2013', source: '国标', content: '建筑工程施工质量验收应划分为单位工程、分部工程、分项工程和检验批，实行见证取样送检与隐蔽工程验收制度。' },
    { title: '建设工程工程量清单计价规范', category: '规范' as const, code: 'GB/T 50500-2013', source: '国标', content: '工程量清单应采用综合单价计价，措施项目费按项或计算基础列项，投标报价不得低于成本。' },
    { title: '建筑施工安全检查标准', category: '规范' as const, code: 'JGJ 59-2011', source: '行标', content: '建筑施工安全检查评定应符合满分制，隐患整改应闭环，危大工程须编制专项方案并组织论证。' },
    { title: '建筑地基基础工程施工质量验收标准', category: '规范' as const, code: 'GB 50202-2018', source: '国标', content: '地基基础施工前应进行图纸会审与基坑支护设计审查，降水与监测应符合专项方案。' },
    { title: '投标管理办法（企业制度）', category: '企业制度' as const, code: 'Q/FY 001-2025', source: '企业', content: '投标文件须双人复核否决条款，法定代表人授权书、签字盖章完整，封标前逐项核对。' },
    { title: '标准技术交底范本（企业范本）', category: '范本' as const, code: 'MB-001', source: '企业', content: '技术交底应包含交底范围、工艺要点、质量标准与验收、安全文明要求，交底签到齐全留痕。' },
  ];
  for (const k of kb) createKnowledge(tenant.id, k);
  console.log(`[seed] 已写入 ${kb.length} 条工程规范/范本/制度。`);
  console.log('[seed] 演示账号: admin@demo.com / admin123（管理员） | reviewer@demo.com / review123（复核员） | member@demo.com / member123');
}

seed();
