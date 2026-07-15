import type { Template } from '@/lib/types';
import { cardPath } from '@/lib/cardPath';
import { variant } from './variant';

const BASE = 340;

// Frames — an editorial multi-row grid that crawls horizontally, pausing on the
// featured frame of each row (the Flow ease supplies the hold). Rows can be
// phase-offset from one another and given a shared tilt.
const frames: Template = {
  meta: { id: 'frames-01', name: 'Frames 01', group: 'Frames', defaultEasing: { id: 'flow' } },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 2, max: 16, step: 1,   default: 12 },
    { key: 'rows',         label: 'Rows',          type: 'slider', min: 1, max: 5, step: 1,    default: 3 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 500, step: 1, default: 200 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'gap',          label: 'Gap',           type: 'slider', min: 0, max: 300, step: 1,  default: 30 },
    { key: 'rowOffset',    label: 'Row Offset',    type: 'slider', min: 0, max: 1, step: 0.05, default: 0.3 },
    { key: 'bigScale',     label: 'Big Scale',     type: 'slider', min: 100, max: 180, step: 1, default: 120 },
    { key: 'tilt',         label: 'Tilt',          type: 'slider', min: -20, max: 20, step: 1, default: 0 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 3, step: 0.1,  default: 0.6 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const sizeFactor = v.cardSize / BASE;
    const rows = Math.max(1, Math.round(v.rows));
    const row = index % rows;
    const colIndex = Math.floor(index / rows);
    const perRow = Math.ceil(count / rows);

    // Each row crawls on its own phase, offset from the row above.
    const phase = ctx.easedPhase((frame / ctx.fps) * v.speed + row * v.rowOffset);

    // Horizontal conveyor within the row (wraps for a seamless crawl).
    const p = cardPath({ kind: 'line', index: colIndex, count: perRow, phase, gap: 1, wrap: true });
    const offset = p.x;

    const spacingX = (v.cardSize + v.gap) * sizeFactor;
    const x = offset * spacingX + v.offset.x;
    const y = (row - (rows - 1) / 2) * ((v.cardSize * 0.75) + v.gap) * sizeFactor + v.offset.y;

    // Featured frame swells toward Big Scale as the row holds on it.
    const scale = sizeFactor * (1 + (v.bigScale / 100 - 1) * p.featuredness);

    return {
      x,
      y,
      scale,
      rotation: v.tilt * Math.PI / 180,
      alpha: 1,
      depth: p.depthNorm,
    };
  },
};

export const framesVariants: Template[] = [
  frames, // Frames 01 — editorial 3-row crawl
  variant(frames, 'frames-02', 'Frames 02', {
    rows: 2, rowOffset: 0.5, bigScale: 150, gap: 20, speed: 0.4, count: 10,
  }),
  variant(frames, 'frames-03', 'Frames 03', {
    rows: 4, rowOffset: 0.15, bigScale: 130, tilt: -6, gap: 40, speed: 0.8, count: 16,
  }),
  variant(frames, 'frames-04', 'Frames 04', {
    rows: 1, rowOffset: 0, bigScale: 160, tilt: 4, gap: 60, cardSize: 260, speed: 0.5, count: 8,
  }),
];
