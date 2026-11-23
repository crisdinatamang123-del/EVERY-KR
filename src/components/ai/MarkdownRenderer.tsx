/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Copy,
  Check,
  ExternalLink,
  Code2,
  Play,
  Loader2,
  Terminal,
  TrendingUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download
} from 'lucide-react';

export interface MarkdownRendererProps {
  content: string;
  variant?: 'default' | 'compact';
  isStreaming?: boolean;
}

/**
 * Sanitizes URLs to prevent XSS via javascript:, data:, or vbscript: URIs.
 */
export function sanitizeMarkdownUrl(rawUrl?: string): string {
  if (!rawUrl) return '#';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:' ||
      parsed.protocol === 'mailto:' ||
      parsed.protocol === 'tel:'
    ) {
      return trimmed;
    }
    return '#';
  } catch {
    return '#';
  }
}

/**
 * Converts LaTeX math notation into clean, readable Unicode/HTML mathematical representation
 * and converts block $$...$$ or \[...\] expressions into ```latex-math fenced blocks for rich rendering.
 */
export function formatInlineLatexMath(expr: string): string {
  if (!expr) return '';
  let out = expr.trim();

  // Matrices: \begin{pmatrix} a & b \\ c & d \end{pmatrix}
  out = out.replace(
    /\\begin\{(?:p|b|v)?matrix\}([\s\S]*?)\\end\{(?:p|b|v)?matrix\}/g,
    (_, body: string) => {
      const rows = body
        .trim()
        .split(/\\\\/)
        .map((r) =>
          r
            .trim()
            .split('&')
            .map((c) => c.trim())
            .join('  ')
        )
        .filter(Boolean);
      return `[ ${rows.join(' ; ')} ]`;
    }
  );

  // Fractions: \frac{a}{b} -> (a)/(b)
  for (let i = 0; i < 3; i++) {
    out = out.replace(/\\(?:d|t)?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');
  }

  // Square roots: \sqrt[n]{x} and \sqrt{x}
  out = out.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, '($2)^(1/$1)');
  out = out.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');

  // Text inside math: \text{...} or \mathrm{...}
  out = out.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^{}]+)\}/g, '$1');

  // Superscripts and subscripts with braces
  const supMap: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '⁺',
    '-': '⁻',
    '=': '⁼',
    '(': '⁽',
    ')': '⁾',
    n: 'ⁿ',
    i: 'ⁱ',
    x: 'ˣ',
    y: 'ʸ',
    T: 'ᵀ'
  };
  const subMap: Record<string, string> = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
    '+': '₊',
    '-': '₋',
    '=': '₌',
    '(': '₍',
    ')': '₎',
    a: 'ₐ',
    e: 'ₑ',
    i: 'ᵢ',
    j: 'ⱼ',
    k: 'ₖ',
    n: 'ₙ',
    m: 'ₘ',
    x: 'ₓ'
  };

  out = out.replace(/\^\{([^{}]+)\}/g, (_, exp: string) => {
    const chars = exp.split('');
    if (chars.every((c) => supMap[c])) {
      return chars.map((c) => supMap[c]).join('');
    }
    return `^(${exp})`;
  });
  out = out.replace(/\^([0-9nT])/g, (_, c: string) => supMap[c] || `^${c}`);

  out = out.replace(/_\{([^{}]+)\}/g, (_, sub: string) => {
    const chars = sub.split('');
    if (chars.every((c) => subMap[c])) {
      return chars.map((c) => subMap[c]).join('');
    }
    return `_(${sub})`;
  });
  out = out.replace(/_([0-9ijknmx])/g, (_, c: string) => subMap[c] || `_${c}`);

  // Common LaTeX symbols & Greek letters
  const symbolReplacements: Array<[RegExp, string]> = [
    [/\\infty\b/g, '∞'],
    [/\\int\b/g, '∫'],
    [/\\iint\b/g, '∬'],
    [/\\oint\b/g, '∮'],
    [/\\sum\b/g, '∑'],
    [/\\prod\b/g, '∏'],
    [/\\partial\b/g, '∂'],
    [/\\nabla\b/g, '∇'],
    [/\\pm\b/g, '±'],
    [/\\mp\b/g, '∓'],
    [/\\times\b/g, '×'],
    [/\\cdot\b/g, '·'],
    [/\\div\b/g, '÷'],
    [/\\neq\b|\\ne\b/g, '≠'],
    [/\\leq\b|\\le\b/g, '≤'],
    [/\\geq\b|\\ge\b/g, '≥'],
    [/\\approx\b/g, '≈'],
    [/\\equiv\b/g, '≡'],
    [/\\propto\b/g, '∝'],
    [/\\Rightarrow\b/g, '⇒'],
    [/\\Leftrightarrow\b|\\iff\b/g, '⇔'],
    [/\\rightarrow\b|\\to\b/g, '→'],
    [/\\leftarrow\b/g, '←'],
    [/\\forall\b/g, '∀'],
    [/\\exists\b/g, '∃'],
    [/\\in\b/g, '∈'],
    [/\\notin\b/g, '∉'],
    [/\\subset\b/g, '⊂'],
    [/\\subseteq\b/g, '⊆'],
    [/\\cup\b/g, '∪'],
    [/\\cap\b/g, '∩'],
    [/\\emptyset\b/g, '∅'],
    [/\\mathbb\{R\}/g, 'ℝ'],
    [/\\mathbb\{N\}/g, 'ℕ'],
    [/\\mathbb\{Z\}/g, 'ℤ'],
    [/\\mathbb\{Q\}/g, 'ℚ'],
    [/\\mathbb\{C\}/g, 'ℂ'],
    [/\\alpha\b/g, 'α'],
    [/\\beta\b/g, 'β'],
    [/\\gamma\b/g, 'γ'],
    [/\\Gamma\b/g, 'Γ'],
    [/\\delta\b/g, 'δ'],
    [/\\Delta\b/g, 'Δ'],
    [/\\epsilon\b|\\varepsilon\b/g, 'ε'],
    [/\\zeta\b/g, 'ζ'],
    [/\\eta\b/g, 'η'],
    [/\\theta\b|\\vartheta\b/g, 'θ'],
    [/\\Theta\b/g, 'Θ'],
    [/\\lambda\b/g, 'λ'],
    [/\\Lambda\b/g, 'Λ'],
    [/\\mu\b/g, 'μ'],
    [/\\nu\b/g, 'ν'],
    [/\\xi\b/g, 'ξ'],
    [/\\pi\b/g, 'π'],
    [/\\Pi\b/g, 'Π'],
    [/\\rho\b/g, 'ρ'],
    [/\\sigma\b/g, 'σ'],
    [/\\Sigma\b/g, 'Σ'],
    [/\\tau\b/g, 'τ'],
    [/\\phi\b|\\varphi\b/g, 'φ'],
    [/\\Phi\b/g, 'Φ'],
    [/\\chi\b/g, 'χ'],
    [/\\psi\b/g, 'ψ'],
    [/\\Psi\b/g, 'Ψ'],
    [/\\omega\b/g, 'ω'],
    [/\\Omega\b/g, 'Ω'],
    [/\\sin\b/g, 'sin'],
    [/\\cos\b/g, 'cos'],
    [/\\tan\b/g, 'tan'],
    [/\\cot\b/g, 'cot'],
    [/\\sec\b/g, 'sec'],
    [/\\csc\b/g, 'csc'],
    [/\\ln\b/g, 'ln'],
    [/\\log\b/g, 'log'],
    [/\\exp\b/g, 'exp'],
    [/\\lim\b/g, 'lim'],
    [/\\det\b/g, 'det'],
    [/\\left\s*([()[\]|])/g, '$1'],
    [/\\right\s*([()[\]|])/g, '$1'],
    [/\\left\\\{/g, '{'],
    [/\\right\\\}/g, '}'],
    [/\\,/g, ' '],
    [/\\;/g, ' '],
    [/\\quad\b/g, '  '],
    [/\\qquad\b/g, '    ']
  ];

  for (const [regex, replacement] of symbolReplacements) {
    out = out.replace(regex, replacement);
  }

  return out;
}

/**
 * Normalizes Markdown content so that:
 * 1. Internal [ACTION:...] directives are stripped.
 * 2. Block LaTeX ($$...$$ or \[...\]) and inline LaTeX ($...$ or \(...\)) are cleanly formatted.
 * 3. In-flight streaming responses with an unclosed code fence or trailing unclosed ** bold marker
 *    render smoothly without flickering raw ** symbols.
 */
export function normalizeMarkdownContent(rawContent: string): string {
  if (!rawContent) return '';

  let text = rawContent
    .replace(/\[ACTION:[^\]]*\]/g, '')
    .replace(/\r\n/g, '\n');

  // Protect existing fenced code blocks before transforming LaTeX math
  const codeBlockPlaceholders: string[] = [];
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    const idx = codeBlockPlaceholders.length;
    codeBlockPlaceholders.push(match);
    return `@@EVERYKR_CODE_BLOCK_${idx}@@`;
  });

  // Convert display math $$...$$ and \[...\] into ```latex-math fenced blocks
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, mathBody: string) => {
    return `\n\`\`\`latex-math\n${mathBody.trim()}\n\`\`\`\n`;
  });
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, mathBody: string) => {
    return `\n\`\`\`latex-math\n${mathBody.trim()}\n\`\`\`\n`;
  });

  // Convert inline \(...\) and $...$ into formatted inline math code spans
  text = text.replace(/\\\(([^\n]+?)\\\)/g, (_, mathBody: string) => {
    return `\`${formatInlineLatexMath(mathBody)}\``;
  });
  text = text.replace(/(^|[^$\\])\$([^\s$][^$\n]{0,120}?[^\s$]|[^\s$])\$(?!\$)/gm, (full, prefix: string, mathBody: string) => {
    // Avoid currency like $100 or $4,500
    if (/^[0-9,.]+(\s*(million|billion|thousand|k|m|usd|krw))?$/i.test(mathBody.trim())) {
      return full;
    }
    return `${prefix}\`${formatInlineLatexMath(mathBody)}\``;
  });

  // Restore protected code blocks
  text = text.replace(/@@EVERYKR_CODE_BLOCK_(\d+)@@/g, (_, idxStr: string) => {
    return codeBlockPlaceholders[Number(idxStr)] || '';
  });

  // If a fenced code block is currently open during streaming, temporarily close it at the end
  const fenceMatches = text.match(/```/g);
  if (fenceMatches && fenceMatches.length % 2 === 1) {
    text = `${text}\n\`\`\``;
  } else {
    // Check if the last line has an unclosed ** bold marker while streaming
    const lines = text.split('\n');
    const lastLineIdx = lines.length - 1;
    const lastLine = lines[lastLineIdx] || '';
    const boldMarkers = lastLine.match(/\*\*/g);
    if (boldMarkers && boldMarkers.length % 2 === 1) {
      if (lastLine.endsWith('**')) {
        lines[lastLineIdx] = lastLine.slice(0, -2);
      } else {
        lines[lastLineIdx] = `${lastLine}**`;
      }
      text = lines.join('\n');
    }
  }

  return text;
}

// ============================================================================
// SAFE MATHEMATICAL EXPRESSION EVALUATOR & INTERACTIVE SVG GRAPH COMPONENT
// ============================================================================

export interface MathGraphConfig {
  title?: string;
  xLabel?: string;
  yLabel?: string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  functions?: Array<{
    expr: string;
    label?: string;
    color?: string;
  }>;
  points?: Array<{
    x: number;
    y: number;
    label?: string;
    color?: string;
  }>;
  series?: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
}

function evaluateSafeMathExpression(expr: string, xVal: number): number | null {
  try {
    let clean = expr
      .trim()
      .toLowerCase()
      .replace(/^[a-z]\s*\(\s*x\s*\)\s*=\s*/i, '')
      .replace(/^y\s*=\s*/i, '');

    // Insert explicit multiplication for patterns like 2x, 3(x+1), (x+1)(x-1), x sin(x)
    clean = clean
      .replace(/(\d)([a-z(])/g, '$1*$2')
      .replace(/(\))(\d|[a-z(])/g, '$1*$2')
      .replace(/\bx\s*\(/g, 'x*(')
      .replace(/\^/g, '**');

    // Replace math functions & constants with Math.*
    clean = clean
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\basin\b/g, 'Math.asin')
      .replace(/\bacos\b/g, 'Math.acos')
      .replace(/\batan\b/g, 'Math.atan')
      .replace(/\bsinh\b/g, 'Math.sinh')
      .replace(/\bcosh\b/g, 'Math.cosh')
      .replace(/\btanh\b/g, 'Math.tanh')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\bcbrt\b/g, 'Math.cbrt')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bln\b/g, 'Math.log')
      .replace(/\blog10\b/g, 'Math.log10')
      .replace(/\blog\b/g, 'Math.log')
      .replace(/\bexp\b/g, 'Math.exp')
      .replace(/\bpi\b/g, 'Math.PI');

    // Replace standalone e with Math.E (not inside words or scientific notation)
    clean = clean.replace(/\be\b/g, 'Math.E');

    // Validate only safe characters remain after stripping Math.* identifiers
    const stripped = clean.replace(
      /Math\.(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|abs|log10|log|exp|PI|E)/g,
      ''
    );
    if (!/^[0-9x+\-*/().\s,*]+$/.test(stripped)) {
      return null;
    }

    const fn = new Function('x', `return (${clean});`);
    const result = Number(fn(xVal));
    if (!Number.isFinite(result) || Math.abs(result) > 1e6) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

function parseMathGraphConfig(rawCode: string): MathGraphConfig {
  const trimmed = rawCode.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      return parsed as MathGraphConfig;
    }
  } catch {
    // Fallback: parse line-by-line function expressions (e.g. f(x) = x^2 - 4*x + 3)
  }

  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));

  const colors = ['#19B6A4', '#4BA3FF', '#F59E0B', '#EC4899', '#A855F7'];
  const functions = lines.slice(0, 4).map((line, idx) => ({
    expr: line,
    label: line,
    color: colors[idx % colors.length]
  }));

  return {
    title: 'Interactive Mathematical Function Plot',
    xDomain: [-10, 10],
    functions: functions.length > 0 ? functions : [{ expr: 'x^2 - 4*x + 3', label: 'f(x) = x² - 4x + 3', color: '#19B6A4' }]
  };
}

const MathGraphBlock: React.FC<{ rawConfig: string }> = ({ rawConfig }) => {
  const baseConfig = useMemo(() => parseMathGraphConfig(rawConfig), [rawConfig]);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const colors = ['#19B6A4', '#4BA3FF', '#F59E0B', '#EC4899', '#A855F7'];

  // If config has categorical series (bar chart mode)
  if (baseConfig.series && baseConfig.series.length > 0 && (!baseConfig.functions || baseConfig.functions.length === 0)) {
    const maxVal = Math.max(...baseConfig.series.map((s) => Math.abs(s.value)), 1);
    return (
      <div className="my-3 rounded-2xl border border-slate-700/80 bg-[#071120] p-4 text-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#19B6A4]" />
            <span className="text-xs font-bold tracking-wide text-white">
              {baseConfig.title || 'Interactive Data Chart'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">EVERYKR AI Analytics</span>
        </div>
        <div className="space-y-2.5">
          {baseConfig.series.map((item, idx) => {
            const pct = Math.min(100, Math.max(4, (Math.abs(item.value) / maxVal) * 100));
            const barColor = item.color || colors[idx % colors.length];
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{item.label}</span>
                  <span className="font-mono font-bold text-[#19B6A4]">
                    {item.value.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const baseXMin = baseConfig.xDomain?.[0] ?? -10;
  const baseXMax = baseConfig.xDomain?.[1] ?? 10;
  const center = (baseXMin + baseXMax) / 2;
  const halfSpan = ((baseXMax - baseXMin) / 2) * zoomFactor;
  const xMin = center - halfSpan;
  const xMax = center + halfSpan;

  const functions =
    baseConfig.functions && baseConfig.functions.length > 0
      ? baseConfig.functions
      : [{ expr: 'x^2 - 4*x + 3', label: 'f(x) = x² - 4x + 3', color: '#19B6A4' }];

  const width = 560;
  const height = 300;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Sample 200 points per function
  const sampledData = useMemo(() => {
    const steps = 200;
    let minY = Infinity;
    let maxY = -Infinity;

    const allCurves = functions.map((fn, idx) => {
      const pts: Array<{ x: number; y: number | null }> = [];
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        const y = evaluateSafeMathExpression(fn.expr, x);
        if (y !== null && Math.abs(y) < 1e4) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        pts.push({ x, y });
      }
      return {
        expr: fn.expr,
        label: fn.label || `f${idx + 1}(x) = ${fn.expr}`,
        color: fn.color || colors[idx % colors.length],
        pts
      };
    });

    if (baseConfig.points) {
      for (const p of baseConfig.points) {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }

    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
      minY = -10;
      maxY = 10;
    } else if (Math.abs(maxY - minY) < 1e-6) {
      minY -= 5;
      maxY += 5;
    } else {
      const margin = (maxY - minY) * 0.12;
      minY -= margin;
      maxY += margin;
    }

    if (baseConfig.yDomain && zoomFactor === 1) {
      minY = baseConfig.yDomain[0];
      maxY = baseConfig.yDomain[1];
    }

    return { allCurves, yMin: minY, yMax: maxY };
  }, [functions, xMin, xMax, baseConfig.points, baseConfig.yDomain, zoomFactor]);

  const { allCurves, yMin, yMax } = sampledData;

  const toSvgX = (x: number) => padLeft + ((x - xMin) / (xMax - xMin)) * plotW;
  const toSvgY = (y: number) => padTop + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const zeroX = xMin <= 0 && xMax >= 0 ? toSvgX(0) : null;
  const zeroY = yMin <= 0 && yMax >= 0 ? toSvgY(0) : null;

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => xMin + t * (xMax - xMin));
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + t * (yMax - yMin));

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    if (relX < padLeft || relX > width - padRight) {
      setHoverX(null);
      return;
    }
    const mathX = xMin + ((relX - padLeft) / plotW) * (xMax - xMin);
    setHoverX(mathX);
  };

  return (
    <div className="my-3 rounded-2xl border border-slate-700/80 bg-[#071120] p-4 text-slate-100 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#19B6A4]" />
          <span className="text-xs font-bold tracking-wide text-white">
            {baseConfig.title || 'Interactive Mathematical Function Graph'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomFactor((z) => Math.max(0.25, z * 0.7))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomFactor((z) => Math.min(4, z * 1.4))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomFactor(1)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Reset view"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Function Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-2 text-[11px] font-mono">
        {allCurves.map((c, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full" style={{ backgroundColor: c.color }} />
            <span className="text-slate-200">{c.label}</span>
          </div>
        ))}
        {hoverX !== null && (
          <div className="ms-auto text-emerald-400">
            x = {hoverX.toFixed(2)}
            {allCurves.map((c, idx) => {
              const yVal = evaluateSafeMathExpression(c.expr, hoverX);
              return yVal !== null ? ` | y${idx + 1} = ${yVal.toFixed(3)}` : '';
            })}
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto rounded-xl bg-[#050B18] border border-slate-800/90 select-none cursor-crosshair"
        onMouseMove={handleSvgMouseMove}
        onMouseLeave={() => setHoverX(null)}
      >
        <defs>
          <clipPath id="everykr-math-plot-clip">
            <rect x={padLeft} y={padTop} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Grid lines & tick labels */}
        {xTicks.map((t, idx) => {
          const sx = toSvgX(t);
          return (
            <g key={`xt-${idx}`}>
              <line
                x1={sx}
                y1={padTop}
                x2={sx}
                y2={height - padBottom}
                stroke="#1E293B"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={sx}
                y={height - padBottom + 16}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="10"
                fontFamily="monospace"
              >
                {Number(t.toFixed(1))}
              </text>
            </g>
          );
        })}

        {yTicks.map((t, idx) => {
          const sy = toSvgY(t);
          return (
            <g key={`yt-${idx}`}>
              <line
                x1={padLeft}
                y1={sy}
                x2={width - padRight}
                y2={sy}
                stroke="#1E293B"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={padLeft - 6}
                y={sy + 3}
                textAnchor="end"
                fill="#94A3B8"
                fontSize="10"
                fontFamily="monospace"
              >
                {Number(t.toFixed(1))}
              </text>
            </g>
          );
        })}

        {/* Primary Axes (x = 0 and y = 0) */}
        {zeroX !== null && (
          <line
            x1={zeroX}
            y1={padTop}
            x2={zeroX}
            y2={height - padBottom}
            stroke="#475569"
            strokeWidth="1.5"
          />
        )}
        {zeroY !== null && (
          <line
            x1={padLeft}
            y1={zeroY}
            x2={width - padRight}
            y2={zeroY}
            stroke="#475569"
            strokeWidth="1.5"
          />
        )}

        {/* Plot Curves */}
        <g clipPath="url(#everykr-math-plot-clip)">
          {allCurves.map((curve, idx) => {
            const segments: string[] = [];
            let currentPath = '';
            for (const pt of curve.pts) {
              if (pt.y === null || pt.y < yMin - (yMax - yMin) || pt.y > yMax + (yMax - yMin)) {
                if (currentPath) {
                  segments.push(currentPath);
                  currentPath = '';
                }
                continue;
              }
              const sx = toSvgX(pt.x).toFixed(1);
              const sy = toSvgY(pt.y).toFixed(1);
              currentPath += currentPath ? ` L ${sx} ${sy}` : `M ${sx} ${sy}`;
            }
            if (currentPath) segments.push(currentPath);

            return (
              <g key={`curve-${idx}`}>
                {segments.map((d, sIdx) => (
                  <path
                    key={sIdx}
                    d={d}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            );
          })}

          {/* Highlighted Special Points (Roots, Extrema, Intersections) */}
          {baseConfig.points?.map((pt, idx) => {
            const sx = toSvgX(pt.x);
            const sy = toSvgY(pt.y);
            return (
              <g key={`pt-${idx}`}>
                <circle
                  cx={sx}
                  cy={sy}
                  r="4.5"
                  fill={pt.color || '#F59E0B'}
                  stroke="#050B18"
                  strokeWidth="1.5"
                />
                {pt.label && (
                  <text
                    x={sx + 6}
                    y={sy - 6}
                    fill="#F8FAFC"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {pt.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Interactive Hover Crosshair */}
          {hoverX !== null && (
            <g>
              <line
                x1={toSvgX(hoverX)}
                y1={padTop}
                x2={toSvgX(hoverX)}
                y2={height - padBottom}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {allCurves.map((c, idx) => {
                const yVal = evaluateSafeMathExpression(c.expr, hoverX);
                if (yVal === null) return null;
                return (
                  <circle
                    key={`hover-pt-${idx}`}
                    cx={toSvgX(hoverX)}
                    cy={toSvgY(yVal)}
                    r="4"
                    fill={c.color}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

// ============================================================================
// DISPLAY MATH BLOCK COMPONENT (For LaTeX Equations)
// ============================================================================

const LatexMathDisplayBlock: React.FC<{ rawLatex: string }> = ({ rawLatex }) => {
  const [copied, setCopied] = useState(false);
  const formatted = useMemo(() => formatInlineLatexMath(rawLatex), [rawLatex]);

  return (
    <div className="my-2.5 rounded-xl border border-[#19B6A4]/30 bg-[#071526] px-4 py-3 text-slate-100 shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
      <div className="font-mono text-xs sm:text-sm tracking-wide text-[#E2F1FF] whitespace-pre-wrap leading-relaxed">
        {formatted}
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(rawLatex);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-mono shrink-0 cursor-pointer flex items-center gap-1"
        title="Copy LaTeX source"
      >
        {copied ? <Check className="w-3 h-3 text-[#19B6A4]" /> : <Copy className="w-3 h-3" />}
        <span>{copied ? 'Copied' : 'LaTeX'}</span>
      </button>
    </div>
  );
};

// ============================================================================
// CODE BLOCK WITH INLINE ISOLATED SANDBOX EXECUTION
// ============================================================================

const EXECUTABLE_LANGUAGES = new Set([
  'python',
  'py',
  'javascript',
  'js',
  'typescript',
  'ts',
  'html'
]);

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [execResult, setExecResult] = useState<{
    status: string;
    stdout: string;
    stderr: string;
    durationMs: number;
    htmlPreview?: string;
  } | null>(null);

  const normalizedLang = (lang || 'code').toLowerCase().trim();
  const isExecutable = EXECUTABLE_LANGUAGES.has(normalizedLang);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSnippet = () => {
    const extMap: Record<string, string> = {
      python: 'py',
      py: 'py',
      javascript: 'js',
      js: 'js',
      typescript: 'ts',
      ts: 'ts',
      html: 'html',
      css: 'css',
      json: 'json',
      sql: 'sql'
    };
    const ext = extMap[normalizedLang] || 'txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `everykr_ai_snippet.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExecuteInline = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const targetLang =
        normalizedLang === 'py' || normalizedLang === 'python'
          ? 'python'
          : normalizedLang === 'ts' || normalizedLang === 'typescript'
          ? 'typescript'
          : normalizedLang === 'html'
          ? 'html'
          : 'javascript';

      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: 'inline_chat_runner',
          language: targetLang,
          code
        })
      });
      const data = await res.json();
      if (data?.job) {
        setExecResult({
          status: data.job.status || 'completed',
          stdout: data.job.stdout || '',
          stderr: data.job.stderr || '',
          durationMs: data.job.durationMs || 0,
          htmlPreview: data.job.htmlPreview
        });
      }
    } catch (err: any) {
      setExecResult({
        status: 'failed',
        stdout: '',
        stderr: err?.message || 'Sandbox execution request failed.',
        durationMs: 0
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Render Display Math blocks
  if (normalizedLang === 'latex-math' || normalizedLang === 'math' || normalizedLang === 'latex') {
    return <LatexMathDisplayBlock rawLatex={code} />;
  }

  // Render Interactive Mathematical Graph / Chart blocks
  if (
    normalizedLang === 'math-graph' ||
    normalizedLang === 'plot' ||
    normalizedLang === 'chart' ||
    normalizedLang === 'graph'
  ) {
    return <MathGraphBlock rawConfig={code} />;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-[#0B1523] text-slate-100 my-2.5 shadow-sm font-mono text-xs max-w-full">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#10243A] border-b border-slate-700/70 text-slate-300 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="w-3.5 h-3.5 text-[#19B6A4] shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-200 truncate">
            {lang || 'code'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isExecutable && (
            <button
              type="button"
              onClick={handleExecuteInline}
              disabled={isRunning}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#19B6A4] hover:bg-[#19B6A4]/90 text-[#050B18] text-[11px] font-bold transition-colors cursor-pointer"
              title="Execute code in isolated EVERYKR AI sandbox"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run Code</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadSnippet}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
            title="Download code file"
          >
            <Download className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#19B6A4]" />
                <span className="text-[#19B6A4]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre className="p-3.5 overflow-x-auto text-slate-100 leading-relaxed font-mono whitespace-pre scrollbar-thin">
        <code>{code}</code>
      </pre>

      {execResult && (
        <div className="border-t border-slate-700/80 bg-[#050B18] p-3 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 mb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 text-[#4BA3FF] font-bold">
              <Terminal className="w-3.5 h-3.5" />
              <span>Sandbox Execution Output</span>
            </span>
            <span className="text-emerald-400">
              {execResult.status.toUpperCase()} · {execResult.durationMs}ms
            </span>
          </div>
          {execResult.htmlPreview ? (
            <iframe
              title="Inline HTML Sandbox Preview"
              sandbox=""
              srcDoc={execResult.htmlPreview}
              className="w-full h-40 rounded-lg border border-slate-800 bg-white"
            />
          ) : (
            <pre className="whitespace-pre-wrap text-emerald-300 overflow-x-auto max-h-48">
              {execResult.stdout || '(Completed with no stdout output)'}
            </pre>
          )}
          {execResult.stderr && (
            <pre className="whitespace-pre-wrap text-rose-400 overflow-x-auto max-h-36 mt-1.5 pt-1.5 border-t border-slate-800">
              {execResult.stderr}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  variant = 'default'
}) => {
  const normalizedContent = useMemo(() => normalizeMarkdownContent(content), [content]);
  const isCompact = variant === 'compact';

  const markdownComponents: Components = useMemo(
    () => ({
      h1: ({ children }) => (
        <h1
          className={`${
            isCompact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
          } font-extrabold text-[#10243A] dark:text-white tracking-tight mt-3 mb-2 first:mt-0 pb-1.5 border-b border-slate-200/80 dark:border-slate-700/80`}
        >
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2
          className={`${
            isCompact ? 'text-sm sm:text-base' : 'text-base sm:text-lg'
          } font-bold text-[#10243A] dark:text-white tracking-tight mt-3 mb-1.5 first:mt-0 pb-1 border-b border-slate-200/60 dark:border-slate-800`}
        >
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3
          className={`${
            isCompact ? 'text-[13px] sm:text-sm' : 'text-sm sm:text-base'
          } font-bold text-[#10243A] dark:text-[#19B6A4] mt-2.5 mb-1.5 first:mt-0`}
        >
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4
          className={`${
            isCompact ? 'text-xs sm:text-[13px]' : 'text-[13px] sm:text-sm'
          } font-bold text-[#1769AA] dark:text-sky-300 mt-2 mb-1 first:mt-0`}
        >
          {children}
        </h4>
      ),
      p: ({ children }) => (
        <p className="my-1.5 first:mt-0 last:mb-0 leading-relaxed break-words text-slate-700 dark:text-slate-200">
          {children}
        </p>
      ),
      strong: ({ children }) => (
        <strong className="font-bold text-[#10243A] dark:text-white">
          {children}
        </strong>
      ),
      em: ({ children }) => (
        <em className="italic text-slate-800 dark:text-slate-200">
          {children}
        </em>
      ),
      ul: ({ children }) => (
        <ul className="list-disc pl-5 my-2 space-y-1.5 marker:text-[#19B6A4] text-slate-700 dark:text-slate-200">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal pl-5 my-2 space-y-1.5 marker:font-bold marker:text-[#1769AA] dark:marker:text-[#19B6A4] text-slate-700 dark:text-slate-200">
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="leading-relaxed break-words pl-0.5">
          {children}
        </li>
      ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-[#19B6A4] pl-3.5 py-1.5 my-2.5 bg-slate-50/90 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 italic rounded-r-xl">
          {children}
        </blockquote>
      ),
      hr: () => (
        <hr className="my-3 border-t border-slate-200 dark:border-slate-700/80" />
      ),
      a: ({ href, children }) => {
        const safeHref = sanitizeMarkdownUrl(href);
        const isExternal = safeHref.startsWith('http://') || safeHref.startsWith('https://');
        return (
          <a
            href={safeHref}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="text-[#1769AA] dark:text-[#19B6A4] hover:underline font-semibold inline-flex items-center gap-0.5 break-all"
          >
            <span>{children}</span>
            {isExternal && <ExternalLink className="w-3 h-3 inline shrink-0" />}
          </a>
        );
      },
      table: ({ children }) => (
        <div className="my-3 w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
          <table className="w-full text-xs text-left border-collapse">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-[#10243A] text-white uppercase text-[10px] tracking-wider">
          {children}
        </thead>
      ),
      tbody: ({ children }) => (
        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 bg-white dark:bg-[#0F1E32]">
          {children}
        </tbody>
      ),
      tr: ({ children }) => (
        <tr className="even:bg-slate-50/70 dark:even:bg-slate-800/40 transition-colors">
          {children}
        </tr>
      ),
      th: ({ children }) => (
        <th className="px-3.5 py-2.5 font-bold text-white whitespace-nowrap border-b border-slate-700">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="px-3.5 py-2 text-slate-700 dark:text-slate-200 align-top break-words">
          {children}
        </td>
      ),
      pre: ({ children }) => <>{children}</>,
      code: ({ className, children }) => {
        const rawCode = String(children ?? '').replace(/\n$/, '');
        const match = /language-([a-zA-Z0-9_-]+)/.exec(className || '');
        const isMultiline = Boolean(match) || rawCode.includes('\n');

        if (isMultiline) {
          return <CodeBlock code={rawCode} lang={match ? match[1] : 'code'} />;
        }

        return (
          <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#1769AA] dark:text-[#19B6A4] font-mono text-[11px] sm:text-xs border border-slate-200/80 dark:border-slate-700 break-words">
            {rawCode}
          </code>
        );
      }
    }),
    [isCompact]
  );

  return (
    <div
      className={`everykr-markdown w-full max-w-full overflow-hidden font-sans ${
        isCompact ? 'text-xs sm:text-[13px]' : 'text-xs sm:text-sm'
      } leading-relaxed text-slate-800 dark:text-slate-100`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => sanitizeMarkdownUrl(url)}
        components={markdownComponents}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};
