import type { CubicBezier } from './types';

export interface EasingPreset extends CubicBezier { name: string }

export const EASING_PRESETS: EasingPreset[] = [
  { name: 'Flow', h1x: 0.86, h1y: 0.14, h2x: 0.14, h2y: 0.86 },
  { name: 'Glide', h1x: 0.33, h1y: 0, h2x: 0, h2y: 1 },
  { name: 'Linear', h1x: 0.25, h1y: 0.25, h2x: 0.75, h2y: 0.75 },
  { name: 'Ease', h1x: 0.87, h1y: 0, h2x: 0.13, h2y: 1 },
  { name: 'Sweep', h1x: 0.7, h1y: 0.101, h2x: 0.3, h2y: 0.899 },
  { name: 'Smooth', h1x: 0.76, h1y: 0, h2x: 0.24, h2y: 1 },
  { name: 'Settle', h1x: 0.8, h1y: 0.27, h2x: 0.2, h2y: 0.75 },
  { name: 'Ease Out', h1x: 0.16, h1y: 1, h2x: 0.3, h2y: 1 },
  { name: 'Snap', h1x: 1, h1y: 0, h2x: 0, h2y: 1 },
  { name: 'Ease In', h1x: 0.42, h1y: 0, h2x: 1, h2y: 1 },
  { name: 'Ease In Out', h1x: 0.42, h1y: 0, h2x: 0.58, h2y: 1 },
  { name: 'Flip', h1x: 0.333, h1y: 0, h2x: 0.571, h2y: 1 },
  { name: 'Quad In', h1x: 0.55, h1y: 0.085, h2x: 0.68, h2y: 0.53 },
  { name: 'Quad Out', h1x: 0.25, h1y: 0.46, h2x: 0.45, h2y: 0.94 },
  { name: 'Quad In Out', h1x: 0.45, h1y: 0.03, h2x: 0.55, h2y: 0.97 },
  { name: 'Cubic In', h1x: 0.55, h1y: 0.055, h2x: 0.675, h2y: 0.19 },
  { name: 'Cubic Out', h1x: 0.215, h1y: 0.61, h2x: 0.355, h2y: 1 },
  { name: 'Cubic In Out', h1x: 0.645, h1y: 0.045, h2x: 0.355, h2y: 1 },
  { name: 'Quart In', h1x: 0.895, h1y: 0.03, h2x: 0.685, h2y: 0.22 },
  { name: 'Quart Out', h1x: 0.165, h1y: 0.84, h2x: 0.44, h2y: 1 },
  { name: 'Quart In Out', h1x: 0.77, h1y: 0, h2x: 0.175, h2y: 1 },
  { name: 'Expo In', h1x: 0.95, h1y: 0.05, h2x: 0.795, h2y: 0.035 },
  { name: 'Expo Out', h1x: 0.19, h1y: 1, h2x: 0.22, h2y: 1 },
  { name: 'Expo In Out', h1x: 1, h1y: 0, h2x: 0, h2y: 1 },
  { name: 'Sine In', h1x: 0.47, h1y: 0, h2x: 0.745, h2y: 0.715 },
  { name: 'Sine Out', h1x: 0.39, h1y: 0.575, h2x: 0.565, h2y: 1 },
  { name: 'Sine In Out', h1x: 0.445, h1y: 0.05, h2x: 0.55, h2y: 0.95 },
];

export const DEFAULT_EASING: CubicBezier = EASING_PRESETS[0];

export function cubicBezierAt(x: number, curve: CubicBezier) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 12; i++) {
    const omt = 1 - t;
    const bx = 3 * omt * omt * t * curve.h1x + 3 * omt * t * t * curve.h2x + t * t * t;
    const derivative = 3 * omt * omt * curve.h1x
      + 6 * omt * t * (curve.h2x - curve.h1x)
      + 3 * t * t * (1 - curve.h2x);
    if (Math.abs(derivative) < 1e-7) break;
    t = Math.max(0, Math.min(1, t - (bx - x) / derivative));
  }
  const omt = 1 - t;
  return 3 * omt * omt * t * curve.h1y + 3 * omt * t * t * curve.h2y + t * t * t;
}

export function timedProgress(
  frame: number,
  fps: number,
  duration: number,
  cycles: number,
  delay: number,
  easing: CubicBezier,
) {
  const elapsed = frame / Math.max(1, fps);
  if (elapsed <= delay) return 0;
  // Delay shifts the start of the motion; it is not part of the active
  // duration. Subtracting it here made delayed animations run faster.
  const activeDuration = Math.max(0.001, duration);
  const raw = ((elapsed - delay) / activeDuration) * Math.max(0.001, cycles);
  const whole = Math.floor(raw);
  const fractional = raw - whole;
  return whole + cubicBezierAt(fractional, easing);
}

export function easingPresetName(curve: CubicBezier) {
  const epsilon = 0.0005;
  return EASING_PRESETS.find((preset) =>
    Math.abs(preset.h1x - curve.h1x) < epsilon
    && Math.abs(preset.h1y - curve.h1y) < epsilon
    && Math.abs(preset.h2x - curve.h2x) < epsilon
    && Math.abs(preset.h2y - curve.h2y) < epsilon
  )?.name ?? 'Custom';
}
