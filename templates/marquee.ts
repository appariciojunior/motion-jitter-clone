import type { Template } from '@/lib/types';
import { variant } from './variant';

// Marquee — an endless multi-column image wall scrolling continuously.
// Adjacent columns can scroll in ALTERNATING directions, with an optional
// tilt angle and per-column phase offset (a Pinterest-style wall).
const BASE = 340;

const marquee: Template = {
  meta: { id: 'marquee-01', name: 'Marquee 01', group: 'Marquee', defaultEasing: { id: 'linear' } },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 4, max: 24, step: 1,    default: 12 },
    { key: 'cols',         label: 'Columns',       type: 'slider', min: 1, max: 5, step: 1,     default: 3 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 400, step: 1,  default: 180 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,   default: 14 },
    { key: 'gap',          label: 'Gap',           type: 'slider', min: 0, max: 120, step: 1,   default: 24 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 3, step: 0.1,   default: 0.6 },
    { key: 'alternate',    label: 'Alternate',     type: 'toggle', options: ['on','off'],       default: 'on' },
    { key: 'angle',        label: 'Angle',         type: 'slider', min: -20, max: 20, step: 1,  default: 0 },
    { key: 'colOffset',    label: 'Column Offset', type: 'slider', min: 0, max: 1, step: 0.05,  default: 0.3 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                               default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const sizeFactor = v.cardSize / BASE;
    const cols = Math.max(1, Math.round(v.cols));
    const col = index % cols;
    const rowIndex = Math.floor(index / cols);
    const perCol = Math.ceil(count / cols);

    // adjacent columns can scroll opposite ways
    const dir = (v.alternate === 'on' && col % 2 === 1) ? -1 : 1;
    const phase = ctx.easedPhase((frame / ctx.fps) * v.speed * dir) + col * v.colOffset;

    // vertical wrap within the column: fold so cards recycle endlessly
    const spacingY = (v.cardSize + v.gap) * sizeFactor;
    let off = rowIndex - phase;
    off = ((off % perCol) + perCol) % perCol;
    if (off > perCol / 2) off -= perCol; // signed offset around centre
    const y = off * spacingY + v.offset.y;

    // columns sit side by side (card width ≈ 0.8 × size)
    const spacingX = (v.cardSize * 0.8 + v.gap) * sizeFactor;
    const x = (col - (cols - 1) / 2) * spacingX + v.offset.x;

    return {
      x,
      y,
      scale: sizeFactor,
      rotation: v.angle * Math.PI / 180, // tilt the whole wall
      alpha: 1,
      depth: rowIndex,
    };
  },
};

export const marqueeVariants: Template[] = [
  marquee,
  variant(marquee, 'marquee-02', 'Marquee 02', { cols: 4, alternate: 'on', speed: 0.9 }),
  variant(marquee, 'marquee-03', 'Marquee 03', { cols: 3, angle: 12, alternate: 'off', speed: 0.5 }),
  variant(marquee, 'marquee-04', 'Marquee 04', { cols: 5, angle: -8, alternate: 'on', speed: 1.2, colOffset: 0.5 }),
];
