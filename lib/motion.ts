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

// Quantize a units/sec speed so a full clip covers a whole number of motif
// periods — the guarantee that frame totalFrames ≡ frame 0 (seamless loops in
// preview and export). `period` is the phase distance after which the template
// repeats: 1 for most conveyors, `count` for lifecycle templates whose state
// wraps every count units (scale, stack). Returns total phase units per clip;
// use as: phase = easedPhase((frame / ctx.totalFrames) * loopCycles(...)).
export function loopCycles(speed: number, duration: number, period = 1): number {
  if (speed === 0) return 0;
  const laps = Math.max(1, Math.round((Math.abs(speed) * duration) / period));
  return Math.sign(speed) * laps * period;
}

// Remap a phase so each unit step holds still for `hold`∈[0,1) of the step,
// then eases across the remainder with `shape`. f(n)=n at integers, so it is
// loop-safe. Used for stepped marquee/ticker motion.
export function stepHold(p: number, hold: number, shape: (t: number) => number = smooth): number {
  const u = frac(p);
  const h = clamp(hold, 0, 0.95);
  return Math.floor(p) + (u <= h ? 0 : shape((u - h) / (1 - h)));
}

// Deterministic 2D hash → [0,1). Seeded-random scatter that is stable across
// frames and reproducible for a given (index, seed) pair.
export const hash2 = (a: number, b: number) =>
  frac(Math.sin(a * 127.1 + b * 311.7 + 1.7) * 43758.5453);

// Which asset a layer slot shows. Templates with meta.repeatAssets cycle a
// small image set across many layers; everything else binds 1:1.
export const assetIndexForSlot = (slot: number, assetCount: number, repeat: boolean) =>
  repeat && assetCount > 0 ? slot % assetCount : slot;
