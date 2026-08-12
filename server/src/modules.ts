// 模块共享常量 - 关键词召回 / 兜底引用 / 章节骨架
// Mock 与 LLM Provider 共用，保证两个生成器的大纲与合规口径一致。
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import { Citation, GeneratedDoc, ModuleKey } from './types.js';

/** 模块 -> 检索关键词（用于从企业知识库召回相关规范做合规溯源） */
export const MODULE_KEYWORDS: Record<ModuleKey, string[]> = {
  bid: ['投标', '招标', '废标', '评标', '资质'],
  plan: ['施工', '方案', '危大', '专项', '安全', '质量'],
  disclosure: ['交底', '工艺', '验收', '技术'],
  log: ['日志', '施工', '安全', '质量', '进度'],
};

/** 兜底引用（知识库为空或 LLM 未命中白名单时仍保证"有来源"） */
export const FALLBACK: Record<ModuleKey, Citation> = {
  bid: { code: 'GB/T 50500', title: '建设工程工程量清单计价规范', source: '国标' },
  plan: { code: 'GB 50300', title: '建筑工程施工质量验收统一标准', source: '国标' },
  disclosure: { code: 'GB 50203', title: '砌体结构工程施工质量验收规范', source: '国标' },
  log: { code: 'JGJ 59', title: '建筑施工安全检查标准', source: '行标' },
};

export type Builder = (params: Record<string, string>) => GeneratedDoc;

/** 各模块的章节骨架（Mock 直接产出；LLM 作为大纲参考输入提示词） */
export const BUILDERS: Record<ModuleKey, Builder> = {
  bid: (params) => {
    const project = p(params, 'projectName', 'XX项目');
    const tender = p(params, 'tenderName', '招标单位');
    const section = p(params, 'bidSection', '施工总承包');
    const budget = p(params, 'budget', '详见招标文件');
    const deadline = p(params, 'deadline', '投标截止前');
    const sections: GeneratedDoc['sections'] = [
      {
        id: 's1',
        heading: '一、项目理解与投标策略',
        content: `本项目为${project}（标段：${section}），招标单位为${tender}。建议采用"技术得分优先、商务报价稳健"策略，重点响应评分办法中技术方案与业绩权重，规避低价恶性竞争。投标预算参考${budget}，须于${deadline}前完成封标。`,
        citations: [],
      },
      {
        id: 's2',
        heading: '二、技术方案摘要',
        content: `依据招标文件技术要求，编制施工组织设计框架：进度以关键线路法编排，质量目标定为一次验收合格，安全文明按标准化示范工地实施。拟投入管理人员与特种作业人员均持证上岗，设备满足工期要求。`,
        citations: [],
      },
      {
        id: 's3',
        heading: '三、商务报价策略',
        content: `报价采用工程量清单综合单价法，对土方、钢筋等波动较大分项预留风险包干，措施项目费按实列项。建议设置 3% 以内浮动空间以应对评标澄清。`,
        citations: [],
      },
    ];
    const riskFindings: GeneratedDoc['riskFindings'] = [
      { level: 'high', point: '资质与业绩要件是否完全响应，缺项将直接废标', suggestion: '封标前逐项核对招标文件"否决投标条款"' },
      { level: 'high', point: '法定代表人授权书、签字盖章完整性', suggestion: '设置双人复核清单，避免漏签、漏盖' },
      { level: 'medium', point: '工期承诺不得超过招标文件上限', suggestion: '核对节点工期与总工期约束' },
    ];
    return { title: `${project} 投标文件（初稿）`, sections, riskFindings };
  },

  plan: (params) => {
    const project = p(params, 'projectName', 'XX项目');
    const structure = p(params, 'structureType', '框架结构');
    const scale = p(params, 'scale', '建筑面积详见图纸');
    const hazard = p(params, 'hazardType', '深基坑/高支模');
    const sections: GeneratedDoc['sections'] = [
      {
        id: 's1',
        heading: '一、工程概况',
        content: `${project}为${structure}，规模${scale}。周边环境及地质条件详见勘察报告，施工前须完成图纸会审与方案专家论证。`,
        citations: [],
      },
      {
        id: 's2',
        heading: '二、施工部署与工艺流程',
        content: `总体按"先地下后地上、先结构后装修"部署。关键工艺：测量放线→支护降水→基础施工→主体结构→机电穿插→装饰收尾。各工序严格执行三检制。`,
        citations: [],
      },
      {
        id: 's3',
        heading: '三、危大工程识别与管控',
        content: `识别危大工程：${hazard}。须编制专项施工方案并组织专家论证，实施前进行安全技术交底，过程中旁站监理、动态监测位移与沉降，超限立即预警停工。`,
        citations: [],
      },
      {
        id: 's4',
        heading: '四、质量保证措施',
        content: `建立样板引路制度，原材料进场复试合格方可使用，隐蔽工程验收合格后方可进入下道工序，留存影像与验收记录。`,
        citations: [],
      },
    ];
    const riskFindings: GeneratedDoc['riskFindings'] = [
      { level: 'high', point: `${hazard}专项方案未经专家论证不得施工`, suggestion: '论证通过并签字留痕后方可实施' },
      { level: 'medium', point: '监测数据超限未预警', suggestion: '设定阈值与自动报警，落实值班' },
    ];
    return { title: `${project} 专项施工方案（初稿）`, sections, riskFindings };
  },

  disclosure: (params) => {
    const project = p(params, 'projectName', 'XX项目');
    const sub = p(params, 'subItem', '分项工程');
    const recipient = p(params, 'recipient', '作业班组');
    const key = p(params, 'techKey', '工艺要点');
    const sections: GeneratedDoc['sections'] = [
      {
        id: 's1',
        heading: '一、交底范围与依据',
        content: `本次交底适用于${project}的${sub}施工，交底对象为${recipient}。依据设计图纸、施工规范及企业工艺标准执行。`,
        citations: [],
      },
      {
        id: 's2',
        heading: '二、施工工艺与操作要点',
        content: `核心工艺要点：${key}。操作前复核轴线标高，过程中控制平整度与垂直度，接头与节点按图施工，严禁随意变更。`,
        citations: [],
      },
      {
        id: 's3',
        heading: '三、质量标准与验收',
        content: `执行"三检制"，允许偏差符合验收规范，隐蔽前通知监理验收并签署记录。`,
        citations: [],
      },
    ];
    const riskFindings: GeneratedDoc['riskFindings'] = [
      { level: 'medium', point: '未交底即上岗作业', suggestion: '交底签到齐全、留存记录' },
    ];
    return { title: `${project} ${sub} 技术交底记录（初稿）`, sections, riskFindings };
  },

  log: (params) => {
    const project = p(params, 'projectName', 'XX项目');
    const date = p(params, 'date', new Date().toISOString().slice(0, 10));
    const weather = p(params, 'weather', '晴');
    const progress = p(params, 'progress', '按计划推进');
    const issues = p(params, 'issues', '无');
    const sections: GeneratedDoc['sections'] = [
      {
        id: 's1',
        heading: '一、气象与出勤',
        content: `${date}，天气${weather}。今日现场作业人数按考勤记录，特种作业人员持证上岗。`,
        citations: [],
      },
      {
        id: 's2',
        heading: '二、今日施工内容',
        content: `施工进展：${progress}。各班组按日计划完成对应工程量，材料供应满足需求。`,
        citations: [],
      },
      {
        id: 's3',
        heading: '三、质量与安全检查',
        content: `质量巡检正常，安全交底到位，防护措施合规。发现隐患已现场整改闭环。`,
        citations: [],
      },
      {
        id: 's4',
        heading: '四、存在问题与次日计划',
        content: `存在问题：${issues}。次日计划：延续当前工序，重点关注交叉作业安全与工序衔接。`,
        citations: [],
      },
    ];
    const riskFindings: GeneratedDoc['riskFindings'] = [
      { level: 'low', point: '日志未及时填报', suggestion: '当日填报、责任人签字' },
    ];
    return { title: `${project} 施工日志 ${date}（初稿）`, sections, riskFindings };
  },
};

/** 从 params 中取参数，空值回退默认 */
function p(params: Record<string, string>, key: string, fallback = ''): string {
  return (params[key] ?? '').trim() || fallback;
}
