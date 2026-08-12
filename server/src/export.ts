// 文档导出 - Word(.docx) 与 PDF(打印友好 HTML)
// Word 用 docx 包生成真正的 .docx（可二次编辑）；PDF 生成打印友好 HTML，
// 前端新窗口打开后调 window.print() 即可"另存为 PDF"或直接打印（浏览器原生渲染中文，无字体嵌入问题）。
// 署名：晋江市飞虹智科技企业管理有限公司 / 飞扬企源研发中心 / 负责人：吴赐虹
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { DocumentVersion, Knowledge, RiskFinding, Section } from './types.js';

export interface ExportData {
  title: string;
  moduleLabel: string;
  statusLabel: string;
  versionNo: number;
  sections: Section[];
  riskFindings: RiskFinding[];
  citedCodes: string[];
  citedKnowledge: Knowledge[];
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

const FONT = { ascii: 'Times New Roman', eastAsia: '宋体' };

export async function buildDocx(data: ExportData): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(new Paragraph({ text: data.title, heading: HeadingLevel.TITLE, spacing: { after: 240 } }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `文档类型：${data.moduleLabel}　|　状态：${data.statusLabel}　|　版本：v${data.versionNo}`, size: 20, color: '555555', font: FONT }),
      ],
      spacing: { after: 80 },
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `生成时间：${data.createdAt}　|　最近更新：${data.updatedAt}　|　创建人：${data.createdByName}`,
          size: 18,
          color: '777777',
          font: FONT,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  for (const s of data.sections) {
    children.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: s.content, font: FONT })],
        spacing: { after: 100 },
      })
    );
    if (s.citations.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `引用依据：${s.citations.map((c) => `${c.code} ${c.title}（${c.source}）`).join('；')}`,
              italics: true,
              size: 18,
              color: '888888',
              font: FONT,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }
  }

  children.push(new Paragraph({ text: '合规风险自检', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }));
  for (const r of data.riskFindings) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `【${levelLabel(r.level)}】${r.point}`, bold: true, font: FONT }),
          new TextRun({ text: `　建议：${r.suggestion}`, font: FONT }),
        ],
        spacing: { after: 80 },
      })
    );
  }

  const doc = new Document({
    creator: '建筑工程AI SaaS',
    description: '由 AI 初稿生成，未经人工复核不得作为正式文件使用',
    sections: [{ children }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

function levelLabel(level: RiskFinding['level']): string {
  return level === 'high' ? '高风险' : level === 'medium' ? '中风险' : '低风险';
}

/** 打印友好 HTML（PDF 导出载体）：A4 + 宋体 + 引用标注 + 自动触发打印 */
export function buildPrintHtml(data: ExportData): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const sectionsHtml = data.sections
    .map(
      (s) => `
    <section class="sec">
      <h2>${esc(s.heading)}</h2>
      <p class="body">${esc(s.content)}</p>
      ${s.citations.length ? `<p class="cite">引用依据：${esc(s.citations.map((c) => `${c.code} ${c.title}（${c.source}）`).join('；'))}</p>` : ''}
    </section>`
    )
    .join('');
  const risksHtml = data.riskFindings
    .map(
      (r) =>
        `<li><b>【${levelLabel(r.level)}】${esc(r.point)}</b><br/>建议：${esc(r.suggestion)}</li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>${esc(data.title)}</title>
<style>
  body{font-family:"SimSun","宋体",serif;color:#111;max-width:720px;margin:0 auto;padding:32px;line-height:1.7;font-size:14px}
  h1{font-size:20px;text-align:center;margin-bottom:4px}
  .meta{text-align:center;color:#666;font-size:12px;margin-bottom:24px}
  h2{font-size:16px;margin:20px 0 8px;border-left:4px solid #b91c1c;padding-left:8px}
  .body{text-indent:2em;margin:8px 0}
  .cite{color:#888;font-size:12px;font-style:italic}
  .risks li{margin-bottom:6px}
  footer{margin-top:32px;text-align:center;color:#999;font-size:11px;border-top:1px solid #ddd;padding-top:8px}
  @media print{body{padding:0}}
</style>
</head>
<body>
<h1>${esc(data.title)}</h1>
<p class="meta">文档类型：${esc(data.moduleLabel)}　|　状态：${esc(data.statusLabel)}　|　版本：v${data.versionNo}<br/>
生成：${esc(data.createdAt)}　|　创建人：${esc(data.createdByName)}</p>
${sectionsHtml}
<h2>合规风险自检</h2>
<ul class="risks">${risksHtml}</ul>
<footer>本文件由 AI 生成初稿，未经人工复核通过不得作为正式文件使用。<br/>晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心</footer>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300)});<\/script>
</body>
</html>`;
}
