import type { CubicBezier } from './types.ts';
import { timedProgress } from './easing.ts';

const TIME_STAGGER_GROUPS = new Set([
  'Carousel',
  'Stack',
  'Magazine',
  'Gravity',
  'Scale',
]);

const REVERSE_DIRECTIONS = new Set([
  'reverse',
  'right',
  'down',
  'backward',
  'ccw',
]);

function nonNegative(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export interface LayerTimingInput {
  frame: number;
  fps: number;
  duration: number;
  cycles: number;
  delay: number;
  stagger: number;
  group: string;
  index: number;
  count: number;
  direction: unknown;
  easing: CubicBezier;
}

export function staggerOrder(
  index: number,
  count: number,
  direction: unknown,
) {
  const safeCount = Math.max(1, Math.round(count));
  const safeIndex = Math.max(0, Math.min(safeCount - 1, Math.round(index)));
  return REVERSE_DIRECTIONS.has(String(direction))
    ? safeCount - 1 - safeIndex
    : safeIndex;
}

export function layerStartOffsetSeconds({
  group,
  delay,
  stagger,
  index,
  count,
  direction,
}: Pick<LayerTimingInput, 'group' | 'delay' | 'stagger' | 'index' | 'count' | 'direction'>) {
  const startDelay = nonNegative(delay);
  if (!TIME_STAGGER_GROUPS.has(group)) return startDelay;
  return startDelay + nonNegative(stagger) * staggerOrder(index, count, direction);
}

export function layerTimingState(input: LayerTimingInput) {
  const fps = Math.max(1, nonNegative(input.fps, 1));
  const startOffsetSeconds = layerStartOffsetSeconds(input);
  const localFrame = Math.max(0, input.frame - startOffsetSeconds * fps);

  return {
    startOffsetSeconds,
    localFrame,
    elapsed: localFrame / fps,
    progress: timedProgress(
      localFrame,
      fps,
      nonNegative(input.duration, 0.001),
      nonNegative(input.cycles, 1),
      0,
      input.easing,
    ),
  };
}
