import type { Template } from '@/lib/types';
import { variant } from './variant';

// Wipe — full-frame images revealed by a directional push. The incoming
// full-bleed image slides in from an edge, hard-covering the previous one;
// the just-arrived image holds at centre until the next one pushes over it.
const BASE = 340;

const wipe: Template = {
  meta: { id: 'wipe-01', name: 'Wipe 01', group: 'Wipe', defaultEasing: { id: 'linear' } },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 2, max: 8, step: 1,     default: 4 },
    { key: 'direction',    label: 'Direction',     type: 'pills',  options: ['left','right','up','down'], default: 'left' },
    { key: 'zoom',         label: 'Zoom',          type: 'slider', min: 80, max: 160, step: 1,  default: 110 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,   default: 0 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0.2, max: 3, step: 0.1, default: 0.7 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                               default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    // full-bleed cover scale so the image fills the frame
    const scale = (ctx.height / BASE) * 1.15 * (v.zoom / 100);

    const phase = ctx.easedPhase((frame / ctx.fps) * v.speed);
    // lifecycle w ∈ [0, count): 0 = this image just fully arrived at centre
    const w = (((phase - index) % count) + count) % count;

    let ox = 0;
    let oy = 0;
    let depth = -w; // most-recent (small w) drawn on top

    const arriving = count - w; // small positive → arriving soon
    if (arriving < 1) {
      const e = arriving; // 1 (off-screen) → 0 (centred)
      const horizontal = v.direction === 'left' || v.direction === 'right';
      const span = horizontal ? ctx.width : ctx.height;
      const sgn = v.direction === 'left' || v.direction === 'up' ? 1 : -1;
      if (horizontal) ox = sgn * e * span;
      else oy = sgn * e * span;
      depth = 10; // ride on top while sliding in
    }

    return {
      x: ox + v.offset.x,
      y: oy + v.offset.y,
      scale,
      rotation: 0,
      alpha: 1,
      depth,
    };
  },
};

export const wipeVariants: Template[] = [
  wipe, // Wipe 01 — push from the left
  variant(wipe, 'wipe-02', 'Wipe 02', {
    direction: 'up', zoom: 120, speed: 0.9,
  }),
  variant(wipe, 'wipe-03', 'Wipe 03', {
    count: 6, direction: 'right', zoom: 100, speed: 0.5,
  }),
];
