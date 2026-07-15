import type { Template } from '@/lib/types';
import { variant } from './variant';

const BASE = 340;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Proximity — a dense grid of small tiles; a focus point pans across and the
// tiles nearest it magnify (macOS-dock style), while distant ones stay small
// and fade slightly.
const proximity: Template = {
  meta: { id: 'proximity-01', name: 'Proximity 01', group: 'Proximity', defaultEasing: { id: 'flow' } },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 6, max: 60, step: 1,   default: 30 },
    { key: 'cols',         label: 'Columns',       type: 'slider', min: 3, max: 10, step: 1,   default: 6 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 20, max: 200, step: 1, default: 90 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'gap',          label: 'Gap',           type: 'slider', min: 0, max: 80, step: 1,   default: 12 },
    { key: 'magnify',      label: 'Magnify',       type: 'slider', min: 0, max: 2, step: 0.05, default: 1 },
    { key: 'focusRadius',  label: 'Focus Radius',  type: 'slider', min: 80, max: 600, step: 1, default: 260 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 3, step: 0.1,  default: 0.6 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const sizeFactor = v.cardSize / BASE;

    // Grid layout centred on the canvas.
    const cols = Math.max(1, Math.round(v.cols));
    const rows = Math.ceil(count / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);

    const spacingX = (v.cardSize + v.gap) * sizeFactor;
    const spacingY = (v.cardSize + v.gap) * sizeFactor;
    const baseX = (col - (cols - 1) / 2) * spacingX;
    const baseY = (row - (rows - 1) / 2) * spacingY;

    // Focus point pans across the grid on a Lissajous path.
    const fx = Math.sin((frame / ctx.fps) * v.speed * 0.8) * (cols * spacingX * 0.35);
    const fy = Math.cos((frame / ctx.fps) * v.speed) * (rows * spacingY * 0.35);

    const dist = Math.hypot(baseX - fx, baseY - fy);
    const r = v.focusRadius;
    const mag = 1 + v.magnify * Math.max(0, 1 - dist / r);

    const scale = sizeFactor * mag;
    const alpha = lerp(0.45, 1, Math.max(0, 1 - dist / (r * 1.6)));

    return {
      x: baseX + v.offset.x,
      y: baseY + v.offset.y,
      scale,
      rotation: 0,
      alpha,
      depth: mag, // magnified tiles draw on top of their neighbours
    };
  },
};

export const proximityVariants: Template[] = [
  proximity, // Proximity 01 — 6-wide dock
  variant(proximity, 'proximity-02', 'Proximity 02', {
    cols: 8, count: 40, magnify: 1.4,
  }),
  variant(proximity, 'proximity-03', 'Proximity 03', {
    cols: 4, count: 20, magnify: 0.8, cardSize: 120,
  }),
  variant(proximity, 'proximity-04', 'Proximity 04', {
    cols: 10, count: 60, magnify: 1.8, cardSize: 70, focusRadius: 340,
  }),
];
