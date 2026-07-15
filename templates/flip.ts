import type { Template } from '@/lib/types';
import { variant } from './variant';

// Flip — split-flap / departure-board. Horizontal rows flip on their X-axis in
// a cascade to reveal the next image; the 'ease' curve gives the mechanical
// slow-fast-slow snap, with a slight darkening at edge-on.
const BASE = 340;

const flip: Template = {
  meta: { id: 'flip-01', name: 'Flip 01', group: 'Flip', defaultEasing: { id: 'ease' } },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 2, max: 12, step: 1,      default: 6 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 700, step: 1,    default: 360 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,     default: 6 },
    { key: 'rowHeight',    label: 'Row Height',    type: 'slider', min: 0.3, max: 1.4, step: 0.05, default: 0.9 }, // fraction of cardSize
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0.1, max: 3, step: 0.1,   default: 0.6 },
    { key: 'cascade',      label: 'Cascade',       type: 'slider', min: 0, max: 0.6, step: 0.02,  default: 0.12 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                                 default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const sizeFactor = v.cardSize / BASE;
    const row = index;

    // rows stack vertically, filling the panel from top to bottom
    const spacing = v.cardSize * v.rowHeight;
    const y = (row - (count - 1) / 2) * spacing * sizeFactor + v.offset.y;
    const x = v.offset.x;

    // per-row flip cascade — each row's flip lags the one above by `cascade`
    const local = ctx.easedPhase((frame / ctx.fps) * v.speed - row * v.cascade);
    const f = local - Math.floor(local); // 0..1 per flip

    // panel flips edge-on about its X-axis (split-flap)
    const scaleY = Math.abs(Math.cos(f * Math.PI)); // 1→0→1
    const alpha = 0.6 + 0.4 * scaleY;               // darken at edge-on

    return {
      x,
      y,
      scale: sizeFactor,
      rotation: 0,
      alpha,
      scaleX: 1,
      scaleY,
      depth: row,
    };
  },
};

export const flipVariants: Template[] = [
  flip, // Flip 01 — steady board cascade
  variant(flip, 'flip-02', 'Flip 02', {
    count: 9, rowHeight: 0.6, speed: 1.2, cascade: 0.06,
  }),
  variant(flip, 'flip-03', 'Flip 03', {
    count: 4, rowHeight: 1.2, speed: 0.4, cascade: 0.3,
  }),
];
