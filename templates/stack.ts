import type { Template } from '@/lib/types';
import { cardPath } from '@/lib/cardPath';
import { variant } from './variant';

const BASE = 340;

// Stack — the carousel turned vertical: a conveyor of cards climbing (or
// descending) through a featured centre slot. Slant shears the line diagonal.
const stack: Template = {
  meta: { id: 'stack-01', name: 'Stack 01', group: 'Stack' },

  controls: [
    { key: 'direction',    label: 'Direction',     type: 'toggle', options: ['forward','reverse'], default: 'forward' },
    { key: 'count',        label: 'Count',         type: 'slider', min: 1, max: 12, step: 1,   default: 5 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 800, step: 1, default: 300 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'gap',          label: 'Gap',           type: 'slider', min: 0, max: 600, step: 1,  default: 70 },
    { key: 'slant',        label: 'Slant',         type: 'slider', min: -100, max: 100, step: 1, default: 0 },
    { key: 'bigScale',     label: 'Big Scale',     type: 'slider', min: 100, max: 200, step: 1, default: 125 },
    { key: 'squeeze',      label: 'Squeeze',       type: 'slider', min: 0, max: 200, step: 1,  default: 90 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 4, step: 0.1,  default: 0.5 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
    { key: 'fade',         label: 'Fade',          type: 'slider', min: 0, max: 100, step: 1,  default: 30 },
  ],

  transform: (frame, index, count, v, ctx) => {
    const dir = v.direction === 'reverse' ? -1 : 1;
    const phase = (frame / ctx.fps) * v.speed * dir;
    const sizeFactor = v.cardSize / BASE;

    const p = cardPath({ kind: 'line', index, count, phase, gap: 1, wrap: true });
    const offsetUnits = p.x; // raw signed offset (gap:1)

    const spacing = (v.cardSize + v.gap) * sizeFactor;
    const y = offsetUnits * spacing;
    const x = y * (v.slant / 100);

    const scale =
      sizeFactor *
      (1 + (v.bigScale / 100 - 1) * p.featuredness) *
      (1 - (1 - p.depthNorm) * 0.3 * (v.squeeze / 100));

    const alpha = 1 - (v.fade / 100) * (1 - p.depthNorm);

    return {
      x: x + v.offset.x,
      y: y + v.offset.y,
      scale,
      rotation: 0,
      alpha,
      depth: p.depthNorm,
    };
  },
};

export const stackVariants: Template[] = [
  stack, // Stack 01 — vertical conveyor
  variant(stack, 'stack-02', 'Stack 02', {
    slant: 45, gap: 40, bigScale: 140, fade: 45, speed: 0.4,
  }),
];
