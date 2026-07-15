// ============================================================
//  EASING ENGINE
//  A shared library of easing curves — cubic-bezier presets plus
//  physics curves (bounce / spring / wiggle / overshoot) — used to
//  reshape how every template advances through its motion cycle.
//
//  A curve is a pure map t∈[0,1] → y, with f(0)=0 and f(1)=1 so it
//  can be dropped into a seamless loop without a discontinuity at the
//  cycle boundary (see ctx.easedPhase in the renderer).
// ============================================================

export type Bezier = [number, number, number, number]; // x1,y1,x2,y2

// What the store persists: either a named preset, or a custom bezier.
export interface EasingSpec {
  id: string;               // preset id, or 'custom'
  bezier?: Bezier;          // present when id === 'custom'
}

export interface EasingPreset {
  id: string;
  label: string;
  group: 'signature' | 'standard' | 'physics';
  bezier?: Bezier;          // bezier-backed presets (editable in the curve editor)
  fn?: (t: number) => number; // physics curves (no bezier handles)
}

// ---------- cubic-bezier evaluator (CSS timing-function maths) ----------
// Given the two control points (endpoints fixed at 0,0 and 1,1), returns a
// function x→y solving for the parametric t via Newton-Raphson + bisection.
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveX = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    // bisection fallback
    let lo = 0, hi = 1;
    t = x;
    while (lo < hi) {
      const xm = sampleX(t);
      if (Math.abs(xm - x) < 1e-6) return t;
      if (x > xm) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };

  return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveX(x)));
}

// ---------- physics curves ----------
// easeOutBounce — the classic three-bounce settle.
function bounce(t: number): number {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
  if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
  t -= 2.625 / d1; return n1 * t * t + 0.984375;
}

// Damped harmonic settle, normalized so f(0)=0 and f(1)=1 exactly.
function springRaw(t: number): number {
  return 1 - Math.exp(-6 * t) * Math.cos(3 * Math.PI * t);
}
const SPRING_0 = springRaw(0), SPRING_1 = springRaw(1);
function spring(t: number): number {
  return (springRaw(t) - SPRING_0) / (SPRING_1 - SPRING_0);
}

// Wobble around the linear path, resolving exactly on 0 and 1.
function wiggle(t: number): number {
  return t + Math.sin(t * Math.PI * 6) * 0.12;
}

// easeOutBack — shoots past the target then eases back.
function overshoot(t: number): number {
  const c1 = 1.70158, c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

// ---------- preset registry ----------
// Signature presets and their bezier values are lifted from the reference tool.
export const EASING_PRESETS: EasingPreset[] = [
  // Signature (the named curves shown by default)
  { id: 'flow',   label: 'Flow',   group: 'signature', bezier: [0.86, 0.14, 0.14, 0.86] },
  { id: 'glide',  label: 'Glide',  group: 'signature', bezier: [0.33, 0.00, 0.00, 1.00] },
  { id: 'linear', label: 'Linear', group: 'signature', bezier: [0.25, 0.25, 0.75, 0.75] },
  { id: 'ease',   label: 'Ease',   group: 'signature', bezier: [0.87, 0.00, 0.13, 1.00] },
  { id: 'sweep',  label: 'Sweep',  group: 'signature', bezier: [0.70, 0.10, 0.30, 0.90] },
  { id: 'smooth', label: 'Smooth', group: 'signature', bezier: [0.76, 0.00, 0.24, 1.00] },
  { id: 'flip',   label: 'Flip',   group: 'signature', bezier: [0.33, 0.00, 0.57, 1.00] },
  { id: 'settle', label: 'Settle', group: 'signature', bezier: [0.80, 0.27, 0.20, 0.75] },
  { id: 'snap',   label: 'Snap',   group: 'signature', bezier: [1.00, 0.00, 0.00, 1.00] },

  // Standard in / out / in-out families
  { id: 'sineIn',    label: 'Sine In',     group: 'standard', bezier: [0.12, 0.00, 0.39, 0.00] },
  { id: 'sineOut',   label: 'Sine Out',    group: 'standard', bezier: [0.61, 1.00, 0.88, 1.00] },
  { id: 'sineInOut', label: 'Sine In-Out', group: 'standard', bezier: [0.37, 0.00, 0.63, 1.00] },
  { id: 'quadIn',    label: 'Quad In',     group: 'standard', bezier: [0.11, 0.00, 0.50, 0.00] },
  { id: 'quadOut',   label: 'Quad Out',    group: 'standard', bezier: [0.50, 1.00, 0.89, 1.00] },
  { id: 'quadInOut', label: 'Quad In-Out', group: 'standard', bezier: [0.45, 0.00, 0.55, 1.00] },
  { id: 'cubicIn',    label: 'Cubic In',     group: 'standard', bezier: [0.32, 0.00, 0.67, 0.00] },
  { id: 'cubicOut',   label: 'Cubic Out',    group: 'standard', bezier: [0.33, 1.00, 0.68, 1.00] },
  { id: 'cubicInOut', label: 'Cubic In-Out', group: 'standard', bezier: [0.65, 0.00, 0.35, 1.00] },
  { id: 'quartIn',    label: 'Quart In',     group: 'standard', bezier: [0.50, 0.00, 0.75, 0.00] },
  { id: 'quartOut',   label: 'Quart Out',    group: 'standard', bezier: [0.25, 1.00, 0.50, 1.00] },
  { id: 'quartInOut', label: 'Quart In-Out', group: 'standard', bezier: [0.76, 0.00, 0.24, 1.00] },
  { id: 'expoIn',    label: 'Expo In',     group: 'standard', bezier: [0.70, 0.00, 0.84, 0.00] },
  { id: 'expoOut',   label: 'Expo Out',    group: 'standard', bezier: [0.16, 1.00, 0.30, 1.00] },
  { id: 'expoInOut', label: 'Expo In-Out', group: 'standard', bezier: [0.87, 0.00, 0.13, 1.00] },

  // Physics (no bezier handles — sampled directly)
  { id: 'bounce',    label: 'Bounce',    group: 'physics', fn: bounce },
  { id: 'spring',    label: 'Spring',    group: 'physics', fn: spring },
  { id: 'wiggle',    label: 'Wiggle',    group: 'physics', fn: wiggle },
  { id: 'overshoot', label: 'Overshoot', group: 'physics', fn: overshoot },
];

export const EASING_MAP: Record<string, EasingPreset> = Object.fromEntries(
  EASING_PRESETS.map((p) => [p.id, p])
);

export const DEFAULT_EASING: EasingSpec = { id: 'linear' };

// Resolve a stored spec into an evaluatable curve.
export function resolveEasing(spec: EasingSpec | undefined): (t: number) => number {
  if (!spec) return (t) => t;
  if (spec.id === 'custom' && spec.bezier) {
    const [a, b, c, d] = spec.bezier;
    return cubicBezier(a, b, c, d);
  }
  const preset = EASING_MAP[spec.id];
  if (!preset) return (t) => t;
  if (preset.fn) return preset.fn;
  if (preset.bezier) {
    const [a, b, c, d] = preset.bezier;
    return cubicBezier(a, b, c, d);
  }
  return (t) => t;
}

// The bezier control points a spec exposes to the editor, or null for a
// physics curve (which has no draggable handles).
export function easingBezier(spec: EasingSpec | undefined): Bezier | null {
  if (!spec) return null;
  if (spec.id === 'custom') return spec.bezier ?? null;
  const preset = EASING_MAP[spec.id];
  return preset?.bezier ?? null;
}

// Sample a curve into [x,y] points for drawing (x linear across [0,1]).
export function sampleEasing(fn: (t: number) => number, n = 48): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = i / n;
    pts.push([x, fn(x)]);
  }
  return pts;
}
