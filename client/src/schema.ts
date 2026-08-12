// 模块表单 schema（前端生成页复用）
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}

export const MODULE_SCHEMAS: Record<string, { label: string; desc: string; fields: FieldDef[] }> = {
  bid: {
    label: '投标AI助手',
    desc: '招标文件解析 · 标书初稿 · 废标风险自检',
    fields: [
      { key: 'projectName', label: '项目名称', required: true, placeholder: '如：XX产业园一期' },
      { key: 'tenderName', label: '招标单位', placeholder: '如：XX建设投资集团' },
      { key: 'bidSection', label: '投标标段', placeholder: '如：施工总承包' },
      { key: 'budget', label: '预算参考', placeholder: '如：约 1.2 亿' },
      { key: 'deadline', label: '封标时限', placeholder: '如：2026-08-20 前' },
    ],
  },
  plan: {
    label: '施工方案AI助手',
    desc: '专项方案生成 · 危大风险识别 · 合规自检',
    fields: [
      { key: 'projectName', label: '项目名称', required: true },
      { key: 'structureType', label: '结构类型', placeholder: '如：框架-剪力墙' },
      { key: 'scale', label: '工程规模', placeholder: '如：建筑面积 8.6 万㎡' },
      { key: 'hazardType', label: '危大工程类型', placeholder: '如：深基坑/高支模' },
    ],
  },
  disclosure: {
    label: '技术交底生成助手',
    desc: '高频轻量化技术交底自动生成',
    fields: [
      { key: 'projectName', label: '项目名称', required: true },
      { key: 'subItem', label: '分部分项', placeholder: '如：钢筋绑扎' },
      { key: 'recipient', label: '交底对象', placeholder: '如：钢筋作业班组' },
      { key: 'techKey', label: '技术要点', placeholder: '如：搭接长度、保护层厚度', textarea: true },
    ],
  },
  log: {
    label: '施工日志/周报生成',
    desc: '全员高频日志与周报自动生成',
    fields: [
      { key: 'projectName', label: '项目名称', required: true },
      { key: 'date', label: '日期', placeholder: '如：2026-08-11' },
      { key: 'weather', label: '天气', placeholder: '如：晴 28℃' },
      { key: 'progress', label: '今日进度', placeholder: '如：3#楼完成 5 层墙柱', textarea: true },
      { key: 'issues', label: '存在问题', placeholder: '如：塔吊调度紧张', textarea: true },
    ],
  },
};

export const MODULE_ORDER = ['bid', 'plan', 'disclosure', 'log'];
