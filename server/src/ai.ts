// AI Provider - 可插拔生成器
// 默认 MockProvider：本地模板生成，输出带规范引用的结构化文档，无需密钥即可演示完整合规链路。
// 真实 LLM：设置环境变量 AI_PROVIDER=llm 后自动切换到 LLMProvider（OpenAI 兼容协议，支持 DeepSeek/通义/混元）。
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import { searchKnowledge } from './db.js';
import { GeneratedDoc, ModuleKey } from './types.js';
import { BUILDERS, FALLBACK, MODULE_KEYWORDS } from './modules.js';
import { LLMProvider } from './llm.js';

export interface GenerateInput {
  module: ModuleKey;
  tenantId: string;
  params: Record<string, string>;
}

export interface AIProvider {
  readonly name: string;
  generate(input: GenerateInput): Promise<GeneratedDoc>;
}

class MockProvider implements AIProvider {
  readonly name = 'mock-template-v1';

  async generate(input: GenerateInput): Promise<GeneratedDoc> {
    const { module, tenantId, params } = input;
    const kb = searchKnowledge(tenantId, MODULE_KEYWORDS[module]);
    // 召回的规范按章节轮转分配引用
    const citeFor = (idx: number): GeneratedDoc['sections'][number]['citations'] => {
      if (kb.length === 0) return [FALLBACK[module]];
      const picked = [kb[idx % kb.length], kb[(idx + 1) % kb.length]].filter(
        (v, i, a) => a.findIndex((x) => x.code === v.code) === i
      );
      return picked.map((k) => ({ code: k.code, title: k.title, source: k.source }));
    };

    const builder = BUILDERS[module];
    const doc = builder(params);
    doc.sections = doc.sections.map((s, i) => ({ ...s, citations: citeFor(i) }));
    return doc;
  }
}

let provider: AIProvider | null = null;

/**
 * 获取当前 AI Provider。
 * AI_PROVIDER=llm  -> 真实大模型（需配置 LLM_API_KEY 等，详见 README）
 * 其他/未设置      -> 本地 Mock 模板（演示模式）
 */
export function getProvider(): AIProvider {
  if (!provider) {
    if (process.env.AI_PROVIDER === 'llm') {
      provider = new LLMProvider();
    } else {
      provider = new MockProvider();
    }
  }
  return provider;
}
