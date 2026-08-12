// LLM Provider - 真实大模型接入（OpenAI 兼容协议）
// 支持 DeepSeek / 阿里通义千问 / 腾讯混元 / OpenAI 等所有 /v1/chat/completions 兼容服务。
// 核心合规约束：LLM 产出的规范引用必须命中"企业知识库 + 兜底引用"白名单，
// 编造/幻觉的规范编号会被替换为库内真实规范 —— 保证"规范溯源"永远真实可信。
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import { searchKnowledge } from './db.js';
import { Citation, GeneratedDoc, ModuleKey, RiskLevel } from './types.js';
import type { AIProvider, GenerateInput } from './ai.js';
import { BUILDERS, FALLBACK, MODULE_KEYWORDS } from './modules.js';

/** LLM 配置（从环境变量读取，构造时解析一次） */
interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  temperature: number;
  jsonMode: boolean;
}

export class LLMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

function loadConfig(): LLMConfig {
  const apiKey = process.env.LLM_API_KEY?.trim() ?? '';
  const baseUrl = (process.env.LLM_BASE_URL?.trim() || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  return {
    baseUrl,
    apiKey,
    model: process.env.LLM_MODEL?.trim() || 'deepseek-chat',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 120_000,
    temperature: Number(process.env.AI_TEMPERATURE) || 0.3,
    jsonMode: (process.env.AI_JSON_MODE ?? '1') !== '0',
  };
}

export class LLMProvider implements AIProvider {
  readonly name: string;
  private cfg: LLMConfig;

  constructor() {
    this.cfg = loadConfig();
    this.name = this.cfg.apiKey ? `llm:${this.cfg.model}` : 'llm(未配置 LLM_API_KEY)';
  }

  async generate(input: GenerateInput): Promise<GeneratedDoc> {
    if (!this.cfg.apiKey) {
      throw new LLMError(
        '未配置 LLM_API_KEY。请在启动前设置环境变量：AI_PROVIDER=llm LLM_API_KEY=xxx LLM_MODEL=xxx（详见 README）。或删除 AI_PROVIDER=llm 使用本地 Mock 演示模式。'
      );
    }
    const { module, tenantId, params } = input;

    // 1. 召回企业知识库规范 -> 引用白名单
    const kb = searchKnowledge(tenantId, MODULE_KEYWORDS[module]);
    const whitelist: Citation[] =
      kb.length > 0 ? kb.map((k) => ({ code: k.code, title: k.title, source: k.source })) : [FALLBACK[module]];

    // 2. 组装提示词：大纲骨架（与 Mock 一致）+ 用户参数 + 白名单
    const outline = BUILDERS[module](params).sections.map((s) => s.heading);
    const spec = buildMessages(module, params, outline, whitelist);

    // 3. 调用 LLM
    const raw = await this.chat(spec);

    // 4. 容错解析 + 白名单校验 + 规范化
    try {
      const parsed = parseLLMJson(raw);
      return normalizeDoc(parsed, whitelist, module, input);
    } catch (e) {
      if (e instanceof LLMError) throw e;
      throw new LLMError(`LLM 输出无法解析为合规文档结构: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async chat(messages: { role: string; content: string }[]): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const body: Record<string, unknown> = {
        model: this.cfg.model,
        messages,
        temperature: this.cfg.temperature,
      };
      if (this.cfg.jsonMode) body.response_format = { type: 'json_object' };
      const resp = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cfg.apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new LLMError(`LLM 接口返回 ${resp.status} ${resp.statusText}: ${errBody.slice(0, 300)}`);
      }
      const data = (await resp.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new LLMError('LLM 返回内容为空');
      return content;
    } catch (e) {
      if (e instanceof LLMError) throw e;
      if (e instanceof Error && e.name === 'AbortError') {
        throw new LLMError(`LLM 请求超时（${this.cfg.timeoutMs}ms）`);
      }
      throw new LLMError(`LLM 请求失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

// ---------------- 提示词 ----------------

function buildMessages(
  module: ModuleKey,
  params: Record<string, string>,
  outline: string[],
  whitelist: Citation[]
): { role: string; content: string }[] {
  const moduleLabel: Record<ModuleKey, string> = {
    bid: '投标文件初稿',
    plan: '专项施工方案初稿',
    disclosure: '技术交底记录初稿',
    log: '施工日志初稿',
  };
  const system = [
    '你是一名资深工程行业专家（投标、施工方案、技术交底、施工日志方向），为工程企业撰写合规文档初稿。',
    '要求：',
    '1. 只输出一个 JSON 对象，不要输出解释文字；可以用 ```json 代码块包裹。',
    '2. JSON 结构：{"title": 文档标题, "sections": [{"heading": 章节标题, "content": 正文}, ...], "riskFindings": [{"level": "high|medium|low", "point": 风险点, "suggestion": 整改建议}, ...]}',
    '3. 每个 section 的正文须引用"可用规范"列表中至少一个规范，并在该 section 内附 "citations": [{"code": 规范编号, "title": 规范名称, "source": 来源}]。',
    '4. citations 的 code 必须逐字取自"可用规范"列表，严禁编造或改动规范编号。',
    '5. riskFindings 的 level 只能是 high / medium / low。',
    '6. 内容专业、具体、可落地，工程术语准确，不空话套话。',
  ].join('\n');
  const user = [
    `文档类型：${moduleLabel[module]}`,
    `用户提供的信息：${JSON.stringify(params)}`,
    `章节大纲（请按此结构撰写，可微调）：${outline.join(' / ')}`,
    `可用规范（引用必须从中选择）：\n${whitelist.map((c) => `- ${c.code} ${c.title}（${c.source}）`).join('\n')}`,
  ].join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

// ---------------- 解析与规范化 ----------------

/** 容错解析：剥离 markdown 代码块，截取首个 { 到末个 } 之间的 JSON */
export function parseLLMJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new LLMError('LLM 输出中未找到 JSON 对象');
  }
  return JSON.parse(t.slice(start, end + 1));
}

const LEVEL_MAP: Record<string, RiskLevel> = {
  high: 'high',
  medium: 'medium',
  low: 'low',
  高: 'high',
  严重: 'high',
  中: 'medium',
  一般: 'low',
  低: 'low',
};

function normalizeLevel(v: unknown): RiskLevel {
  if (typeof v === 'string') {
    const hit = LEVEL_MAP[v.trim().toLowerCase()];
    if (hit) return hit;
  }
  return 'medium';
}

/** 引用白名单校验：只保留库内真实规范；为空则从白名单按序补位（保证"无来源不出稿"） */
function pickCitations(
  rawCites: unknown,
  whitelist: Citation[],
  module: ModuleKey,
  idx: number
): Citation[] {
  const picked: Citation[] = [];
  if (Array.isArray(rawCites)) {
    for (const c of rawCites) {
      if (!c || typeof c !== 'object') continue;
      const code = (c as { code?: unknown }).code;
      if (typeof code !== 'string') continue;
      const hit = whitelist.find((w) => w.code === code.trim());
      if (hit && !picked.some((x) => x.code === hit.code)) picked.push({ ...hit });
    }
  }
  if (picked.length > 0) return picked;
  const fb = whitelist[idx % whitelist.length] ?? FALLBACK[module];
  return [fb];
}

/** 将 LLM 原始输出规范化为 GeneratedDoc（补 id、白名单引用、风险项兜底） */
function normalizeDoc(
  raw: unknown,
  whitelist: Citation[],
  module: ModuleKey,
  input: GenerateInput
): GeneratedDoc {
  const obj = (raw ?? {}) as {
    title?: unknown;
    sections?: unknown;
    riskFindings?: unknown;
  };

  const project = (input.params.projectName ?? '').trim() || 'XX项目';
  const title =
    typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : `${project} 文档（初稿）`;

  const sections: GeneratedDoc['sections'] = [];
  if (Array.isArray(obj.sections)) {
    obj.sections.forEach((s, i) => {
      const sec = s as { heading?: unknown; content?: unknown; citations?: unknown };
      if (!sec || typeof sec !== 'object') return;
      const heading = typeof sec.heading === 'string' ? sec.heading.trim() : '';
      const content = typeof sec.content === 'string' ? sec.content.trim() : '';
      if (!heading && !content) return;
      sections.push({
        id: `s${i + 1}`,
        heading: heading || `章节${i + 1}`,
        content: content || '（内容待补充，请人工复核完善）',
        citations: pickCitations(sec.citations, whitelist, module, i),
      });
    });
  }
  if (sections.length === 0) {
    throw new LLMError('LLM 输出缺少有效章节（sections 为空）');
  }

  const riskFindings: GeneratedDoc['riskFindings'] = [];
  if (Array.isArray(obj.riskFindings)) {
    obj.riskFindings.forEach((r) => {
      const item = r as { level?: unknown; point?: unknown; suggestion?: unknown };
      if (!item || typeof item !== 'object') return;
      const point = typeof item.point === 'string' ? item.point.trim() : '';
      if (!point) return;
      riskFindings.push({
        level: normalizeLevel(item.level),
        point,
        suggestion:
          typeof item.suggestion === 'string' && item.suggestion.trim()
            ? item.suggestion.trim()
            : '请人工复核确认整改措施',
      });
    });
  }
  if (riskFindings.length === 0) {
    riskFindings.push({
      level: 'medium',
      point: 'AI 未输出风险自检项，请复核完整性',
      suggestion: '复核时重点检查合规性与关键要件',
    });
  }

  return { title, sections, riskFindings };
}
