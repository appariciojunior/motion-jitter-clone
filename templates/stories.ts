import type { Template } from '@/lib/types';
import { cardPath } from '@/lib/cardPath';
import { variant } from './variant';

const BASE = 340;

// Stories — a horizontal strip with one dominant featured card and small
// neighbours peeking at the edges. Flat (no fake-3D), fades to the sides.
const stories: Template = {
  meta: { id: 'stories-01', name: 'Stories 01', group: 'Stories' },

  controls: [
    { key: 'direction',    label: 'Direction',     type: 'toggle', options: ['forward','reverse'], default: 'forward' },
    { key: 'count',        label: 'Count',         type: 'slider', min: 1, max: 12, step: 1,   default: 5 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 800, step: 1, default: 300 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 16 },
    { key: 'gap',          label: 'Gap',           type: 'slider', min: 0, max: 600, step: 1,  default: 110 },
    { key: 'bigScale',     label: 'Big Scale',     type: 'slider', min: 100, max: 240, step: 1, default: 170 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 4, step: 0.1,  default: 0.4 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
    { key: 'fade',         label: 'Fade',          type: 'slider', min: 0, max: 100, step: 1,  default: 40 },
  ],

  transform: (frame, index, count, v, ctx) => {
    const dir = v.direction === 'reverse' ? -1 : 1;
    const phase = (frame / ctx.fps) * v.speed * dir;
    const sizeFactor = v.cardSize / BASE;

    const p = cardPath({ kind: 'line', index, count, phase, gap: 1, wrap: true });
    const spacing = (v.cardSize + v.gap) * sizeFactor;

    const scale = sizeFactor * (1 + (v.bigScale / 100 - 1) * p.featuredness);
    const alpha = 1 - (v.fade / 100) * (1 - p.depthNorm);

    return {
      x: p.x * spacing + v.offset.x,
      y: v.offset.y,
      scale,
      rotation: 0,
      alpha,
      depth: p.depthNorm,
    };
  },
};

export const storiesVariants: Template[] = [
  stories, // Stories 01 — dominant centre
  variant(stories, 'stories-02', 'Stories 02', {
    gap: 30, bigScale: 210, fade: 65, cornerRadius: 24, speed: 0.3,
  }),
];
