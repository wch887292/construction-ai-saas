// LLMProvider 全链路测试 - 本地 mock OpenAI 兼容服务（无需真实 API Key）
// 覆盖：正常 JSON（含```json包裹）/ 幻觉引用替换 / 缺失引用补位 / 非 JSON 报错 / 空章节报错 / HTTP 错误 / 超时
// 运行：npm run test:llm
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import assert from 'node:assert/strict';
import http from 'node:http';
import { LLMError, LLMProvider } from './llm.js';
import type { GenerateInput } from './ai.js';

const PORT = 18999;
const BASE = `http://127.0.0.1:${PORT}/v1`;

const WHITELIST_CODE = 'GB/T 50500'; // FALLBACK.bid 的 code，知识库为空时的白名单唯一项

interface MockMsg {
  code: string;
  title: string;
  source: string;
}

// 各场景的 LLM 返回内容
const OK_DOC = {
  title: '测试项目 投标文件（初稿）',
  sections: [
    { heading: '一、项目理解与投标策略', content: '本项目为测试项目，采用技术优先策略。', citations: [{ code: 'GB/T 50500', title: '建设工程工程量清单计价规范', source: '国标' }] },
    { heading: '二、技术方案摘要', content: '按关键线路法编排进度，一次验收合格。', citations: [{ code: 'GB/T 50500', title: '建设工程工程量清单计价规范', source: '国标' }] },
    { heading: '三、商务报价策略', content: '采用综合单价法报价。', citations: [{ code: 'GB/T 50500', title: '建设工程工程量清单计价规范', source: '国标' }] },
  ],
  riskFindings: [
    { level: 'high', point: '资质缺项将废标', suggestion: '封标前逐项核对' },
    { level: '一般', point: '工期承诺超限', suggestion: '' },
  ],
};

const RESPONSES: Record<string, string> = {
  // 用 ```json 代码块包裹，验证容错解析
  ok: '```json\n' + JSON.stringify(OK_DOC) + '\n```',
  hallucinated: JSON.stringify({
    title: '幻觉引用测试',
    sections: [
      {
        heading: '一、测试章节',
        content: '引用了编造规范。',
        citations: [
          { code: 'GB 99999-2099', title: '编造的标准', source: '国标' },
          { code: 'JGJ 666', title: '另一个编造标准', source: '行标' },
        ],
      },
      {
        heading: '二、第二个章节',
        content: '同样编造引用。',
        citations: [{ code: 'ISO 99999', title: '不存在的ISO', source: '国标' }],
      },
    ],
    riskFindings: [{ level: 'low', point: '无风险', suggestion: '无需处理' }],
  }),
  noCites: JSON.stringify({
    title: '缺失引用测试',
    sections: [
      { heading: '一、无引用章节', content: '这条没有引用。' },
      { heading: '二、空引用数组', content: '这条引用为空数组。', citations: [] },
    ],
    riskFindings: [],
  }),
  notJson: '抱歉，我无法完成这个请求，因为我不是一个工程专家。',
  emptySections: JSON.stringify({ title: '空文档', sections: [], riskFindings: [] }),
  httpError: '',
};

let mode = 'ok';

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.method !== 'POST' || !req.url?.includes('/chat/completions')) {
      res.writeHead(404).end('{"error":"not found"}');
      return;
    }
    if (mode === 'httpError') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end('{"error":"mock server error"}');
      return;
    }
    if (mode === 'slow') {
      setTimeout(() => finish(res), 1000);
      return;
    }
    finish(res);
  });
});

function finish(res: http.ServerResponse) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ choices: [{ message: { content: RESPONSES[mode] } }] }));
}

const INPUT: GenerateInput = {
  module: 'bid',
  tenantId: 'no-such-tenant', // 知识库为空 -> 白名单 = [FALLBACK]
  params: { projectName: '测试项目', tenderName: '测试招标方' },
};

let passed = 0;
let failed = 0;
const failures: string[] = [];

function report(name: string, ok: boolean, extra = '') {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name} ${extra}`);
  }
}

async function main() {
  await new Promise<void>((r) => server.listen(PORT, r));
  console.log(`[test:llm] mock OpenAI 服务已启动 :${PORT}\n`);

  process.env.LLM_API_KEY = 'test-key';
  process.env.LLM_BASE_URL = BASE;
  process.env.LLM_MODEL = 'test-model';
  process.env.AI_JSON_MODE = '0';
  process.env.AI_TIMEOUT_MS = '500';
  const provider = new LLMProvider();

  // 场景1：正常 JSON（```json 包裹）
  mode = 'ok';
  try {
    const doc = await provider.generate(INPUT);
    const ok =
      doc.title.includes('测试项目') &&
      doc.sections.length === 3 &&
      doc.sections.every((s) => s.citations.length > 0 && s.citations[0].code === WHITELIST_CODE) &&
      doc.riskFindings.length === 2 &&
      doc.riskFindings[1].level === 'low' && // "一般" -> low
      doc.riskFindings[1].suggestion !== '' && // 空 suggestion 兜底
      doc.sections.every((s) => /^s\d+$/.test(s.id));
    report('正常 JSON 解析与规范化（标题/章节/引用/风险项/兜底）', ok);
  } catch (e) {
    report('正常 JSON 解析与规范化', false, String(e));
  }

  // 场景2：幻觉引用 -> 全部替换为白名单真实规范
  mode = 'hallucinated';
  try {
    const doc = await provider.generate(INPUT);
    const codes = doc.sections.flatMap((s) => s.citations.map((c) => c.code));
    const ok = codes.length > 0 && codes.every((c) => c === WHITELIST_CODE);
    report('幻觉引用替换（GB 99999-2099 / JGJ 666 -> 白名单真实规范）', ok, JSON.stringify(codes));
  } catch (e) {
    report('幻觉引用替换', false, String(e));
  }

  // 场景3：缺失/空引用 -> 白名单补位
  mode = 'noCites';
  try {
    const doc = await provider.generate(INPUT);
    const ok =
      doc.sections.length === 2 &&
      doc.sections.every((s) => s.citations.length > 0 && s.citations[0].code === WHITELIST_CODE) &&
      doc.riskFindings.length === 1 && // 空 riskFindings 兜底
      doc.riskFindings[0].suggestion !== '';
    report('缺失引用补位 + 空风险项兜底', ok);
  } catch (e) {
    report('缺失引用补位', false, String(e));
  }

  // 场景4：非 JSON 输出 -> 明确报错
  mode = 'notJson';
  try {
    await provider.generate(INPUT);
    report('非 JSON 输出抛错', false, '未抛错');
  } catch (e) {
    report('非 JSON 输出抛错（消息含"未找到 JSON 对象"）', e instanceof LLMError && /未找到 JSON 对象/.test(e.message), e instanceof Error ? e.message : String(e));
  }

  // 场景5：空 sections -> 明确报错
  mode = 'emptySections';
  try {
    await provider.generate(INPUT);
    report('空章节抛错', false, '未抛错');
  } catch (e) {
    report('空章节抛错（消息含"缺少有效章节"）', e instanceof LLMError && /缺少有效章节/.test(e.message), e instanceof Error ? e.message : String(e));
  }

  // 场景6：HTTP 500 -> 明确报错
  mode = 'httpError';
  try {
    await provider.generate(INPUT);
    report('HTTP 500 抛错', false, '未抛错');
  } catch (e) {
    report('HTTP 500 抛错（消息含状态码）', e instanceof LLMError && /500/.test(e.message), e instanceof Error ? e.message : String(e));
  }

  // 场景7：超时
  mode = 'slow';
  try {
    await provider.generate(INPUT);
    report('请求超时抛错', false, '未抛错');
  } catch (e) {
    report('请求超时抛错（消息含"超时"）', e instanceof LLMError && /超时/.test(e.message), e instanceof Error ? e.message : String(e));
  }

  // 场景8：未配置 API Key -> 构造不抛错、生成时清晰报错
  delete process.env.LLM_API_KEY;
  try {
    const p2 = new LLMProvider();
    await p2.generate(INPUT);
    report('未配置 Key 生成时清晰报错', false, '未抛错');
  } catch (e) {
    report('未配置 Key 生成时清晰报错（消息含 LLM_API_KEY）', e instanceof LLMError && /LLM_API_KEY/.test(e.message), e instanceof Error ? e.message : String(e));
  }

  server.close();
  console.log(`\n结果: 通过 ${passed} / 失败 ${failed}`);
  if (failed > 0) {
    console.log('失败用例: ' + failures.join(', '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('[test:llm] 运行异常:', e);
  server.close();
  process.exit(1);
});
