// ============================================================
//  WEB MODE — USER SOURCE COMPILER (SPIKE)
//  Turns a pasted JSX/TSX/HTML string into something renderable inside the
//  preview iframe. JSX/TSX goes through sucrase (jsx + typescript + imports
//  → CJS), then the CJS module is evaluated with a tiny require shim that
//  only resolves 'react'. Plain HTML is passed through untouched.
//
//  SECURITY: the compiled module is evaluated with the app's own privileges
//  (see components/WebStage.tsx — the preview iframe is same-origin so the
//  parent can drive React into it). That is acceptable for a local spike
//  where the author is the only source of code, and NOT acceptable once the
//  panel accepts code from anyone else. See the note in WebStage.
// ============================================================

import { transform } from 'sucrase';

export type SourceKind =
  | 'module'      // has export/import or a component declaration
  | 'expression'  // a bare JSX expression — the shape design tools paste out
  | 'html';       // plain markup, no JSX syntax

export interface CompileOk {
  ok: true;
  kind: SourceKind;
  /** For 'module' | 'expression': the component to render. */
  Component?: React.ComponentType<any>;
  /** For 'html': the raw markup. */
  html?: string;
}

export interface CompileErr {
  ok: false;
  error: string;
}

export type CompileResult = CompileOk | CompileErr;

// JSX gives itself away with attribute-expression braces (`foo={...}`), the
// React-only `className`, or map/arrow bodies. Markup pasted out of a design
// tool starts with a lowercase tag and has none of that — but it does have
// `className`, which is why "starts with `<`" alone can't decide this.
const JSX_MARKERS = /className=|\w+=\{|\{[^}]*\.map\(|=>|<>/;

export function detectKind(src: string): SourceKind {
  const s = src.trim();
  if (!s) return 'html';
  if (/^\s*(export|import)\b/m.test(s)) return 'module';
  if (/^\s*</.test(s)) return JSX_MARKERS.test(s) ? 'expression' : 'html';
  // Doesn't start with a tag and has no module syntax — a bare `function Foo()`
  // or `const Foo = () => ...`. Treat as a module; the export lookup below
  // falls back to scanning declarations.
  return 'module';
}

// A bare JSX expression isn't a module, so wrap it into one. The trailing
// semicolon that design tools emit would be a syntax error inside `return (…)`.
function wrapExpression(src: string): string {
  const body = src.trim().replace(/;\s*$/, '');
  return `export default function __Preview() {\n  return (\n${body}\n  );\n}`;
}

function evaluateModule(code: string, React: any): { exports: any } | { error: string } {
  // Only 'react' resolves; anything else fails loudly rather than silently
  // handing back undefined and blowing up mid-render.
  const require = (id: string) => {
    if (id === 'react') return React;
    throw new Error(`import of "${id}" is not supported in web mode (only "react" resolves)`);
  };
  const module = { exports: {} as any };
  try {
    // eslint-disable-next-line no-new-func
    new Function('require', 'module', 'exports', 'React', code)(
      require, module, module.exports, React,
    );
  } catch (e: any) {
    return { error: `Run error: ${e?.message ?? String(e)}` };
  }
  return { exports: module.exports };
}

export function compileSource(src: string, React: any): CompileResult {
  const kind = detectKind(src);
  if (kind === 'html') return { ok: true, kind, html: src };

  const moduleSrc = kind === 'expression' ? wrapExpression(src) : src;

  let code: string;
  try {
    code = transform(moduleSrc, {
      transforms: ['jsx', 'typescript', 'imports'],
      jsxRuntime: 'classic',
      production: true,
    }).code;
  } catch (e: any) {
    return { ok: false, error: `Parse error: ${e?.message ?? String(e)}` };
  }

  const res = evaluateModule(code, React);
  if ('error' in res) return { ok: false, error: res.error };

  const exp = res.exports;
  const Component =
    exp?.default ??
    // No default — accept a single named export, so `export function Card()`
    // works, and prefer a capitalized one when there are several.
    (() => {
      const keys = Object.keys(exp ?? {}).filter((k) => typeof exp[k] === 'function');
      if (keys.length === 1) return exp[keys[0]];
      const upper = keys.filter((k) => /^[A-Z]/.test(k));
      return upper.length === 1 ? exp[upper[0]] : undefined;
    })();

  if (typeof Component !== 'function') {
    return {
      ok: false,
      error: 'No component found — add `export default function MyComponent() { ... }`, or paste a bare JSX element.',
    };
  }
  return { ok: true, kind, Component };
}
