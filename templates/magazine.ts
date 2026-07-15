import type { Template } from '@/lib/types';
import { variant } from './variant';

// Magazine — an open-book page turn. The front page flips from its right edge
// over to the left spine (curved paper), revealing the next page; pages behind
// sit flat in a slightly offset stack.
const BASE = 340;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

const magazine: Template = {
  meta: { id: 'magazine-01', name: 'Magazine 01', group: 'Magazine', defaultEasing: { id: 'flip' } },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 2, max: 10, step: 1,     default: 5 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 700, step: 1,   default: 360 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,    default: 12 },
    { key: 'curve',        label: 'Paper Curve',   type: 'slider', min: 0, max: 0.5, step: 0.02, default: 0.2 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0.2, max: 3, step: 0.1,  default: 0.7 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                                default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const sizeFactor = v.cardSize / BASE;
    const phase = ctx.easedPhase((frame / ctx.fps) * v.speed);

    // lifecycle w ∈ [0, count): 0 = this page just came to the front
    const w = (((phase - index) % count) + count) % count;

    const baseX = v.offset.x;
    const baseY = v.offset.y;
    const halfW = v.cardSize * sizeFactor * 0.5;

    let x = baseX;
    let scaleX = 1;
    let skewY = 0;
    let alpha = 1;

    if (w < 1) {
      // FRONT page turning over the left spine
      const f = clamp(w, 0, 1);
      const sx = Math.cos(f * Math.PI); // 1 → -1
      scaleX = Math.abs(sx);
      x = baseX + halfW * (scaleX - 1);          // right edge sweeps left, pivot at left edge
      skewY = Math.sin(f * Math.PI) * v.curve;   // paper bulges mid-flip
      alpha = 1 - Math.max(0, f - 0.5) * 2;      // blend out after halfway
    } else {
      // pages behind sit flat, faintly offset into a stack
      x = baseX + Math.min(w, 4) * 2;
    }

    return {
      x,
      y: baseY,
      scale: sizeFactor,
      rotation: 0,
      alpha,
      scaleX,
      skewY,
      depth: count - w,
    };
  },
};

export const magazineVariants: Template[] = [
  magazine, // Magazine 01 — gentle page turn
  variant(magazine, 'magazine-02', 'Magazine 02', {
    curve: 0.4, speed: 1.0,
  }),
  variant(magazine, 'magazine-03', 'Magazine 03', {
    count: 8, curve: 0.08, speed: 0.5,
  }),
];
