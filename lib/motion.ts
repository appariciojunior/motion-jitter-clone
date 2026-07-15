// ============================================================
//  MOTION HELPERS
//  Small pure primitives shared by templates — the same shapes the
//  reference app uses in its planner/scene expressions. Keeping them
//  here means every template staggers, pulses, and settles the same way.
// ============================================================

export const TAU = Math.PI * 2;

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

// Fractional part, always in [0,1) even for negative inputs.
export const frac = (x: number) => x - Math.floor(x);

// Smooth 0 → 1 → 0 pulse over one unit (peaks at 0.5). Matches the reference
// `wave` used across its motion expressions.
export const wave = (x: number) => Math.sin(Math.PI * frac(x));

// Smoothstep 0..1 (ease-in-out with zero slope at both ends).
export const smooth = (x: number) => {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Per-card staggered cycle time: each layer offsets its own normalized time by
// its normalized index (u = i/(n-1)) × amount, so cards move individually
// rather than as a block — the canonical `mod(t + u*stagger, 1)` form.
export function staggered(t: number, index: number, count: number, amount: number): number {
  const u = count > 1 ? index / (count - 1) : 0;
  return frac(t + u * amount);
}
