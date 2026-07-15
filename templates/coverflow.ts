import type { Template } from '@/lib/types';
import { cardPath } from '@/lib/cardPath';
import { variant } from './variant';

const BASE = 340;

// Carousel 3D — a cover-flow arc: cards rotate around a centre slot, the front
// card facing the viewer while side cards tilt away and compress into a receding
// stack on either flank.
const coverflow: Template = {
  meta: { id: 'coverflow-01', name: 'Coverflow 01', group: 'Carousel 3D', defaultEasing: { id: 'linear' } },

  controls: [
    { key: 'direction',    label: 'Direction',     type: 'toggle', options: ['forward','reverse'], default: 'forward' },
    { key: 'count',        label: 'Count',         type: 'slider', min: 3, max: 12, step: 1,   default: 7 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 800, step: 1, default: 300 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'gap',          label: 'Gap',           type: 'slider', min: 0, max: 500, step: 1,  default: 260 },
    { key: 'tilt',         label: 'Tilt',          type: 'slider', min: 0, max: 80, step: 1,   default: 55 },
    { key: 'fade',         label: 'Fade',          type: 'slider', min: 0, max: 100, step: 1,  default: 20 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 3, step: 0.1,  default: 0.5 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const dir = v.direction === 'reverse' ? -1 : 1;
    const phase = ctx.easedPhase((frame / ctx.fps) * v.speed * dir);
    const sizeFactor = v.cardSize / BASE;

    const p = cardPath({ kind: 'line', index, count, phase, gap: 1, wrap: true });
    const offset = p.x;                    // signed offset in card units
    const side = Math.sign(offset);
    const a = Math.min(Math.abs(offset), 1); // 0 at centre → 1 at edge

    // Cover-flow horizontal compression: side cards bunch, outliers drift a little.
    const x =
      side * (a * v.gap + Math.max(0, Math.abs(offset) - 1) * v.gap * 0.35) * sizeFactor +
      v.offset.x;

    const skewY = -side * a * (v.tilt * Math.PI / 180);
    const scale = sizeFactor * (1 - a * 0.22);
    const alpha = 1 - (v.fade / 100) * (1 - p.depthNorm);

    return {
      x,
      y: v.offset.y,
      scale,
      rotation: 0,
      alpha,
      skewY,
      depth: p.depthNorm,                  // front card on top
    };
  },
};

export const coverflowVariants: Template[] = [
  coverflow, // Coverflow 01 — classic cover-flow
  variant(coverflow, 'coverflow-02', 'Coverflow 02', {
    gap: 340, tilt: 70, fade: 35, speed: 0.4, count: 9,
  }),
  variant(coverflow, 'coverflow-03', 'Coverflow 03', {
    gap: 180, tilt: 40, fade: 10, speed: 0.7, count: 5,
  }),
  variant(coverflow, 'coverflow-04', 'Coverflow 04', {
    gap: 420, tilt: 78, fade: 50, speed: 1.0, count: 12,
  }),
];
