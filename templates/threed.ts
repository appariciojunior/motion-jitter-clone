import type { Template } from '@/lib/types';
import { variant } from './variant';

const BASE = 340;

// 3D — a corridor fly-through: panels line two receding walls like billboards,
// advancing toward the camera and wrapping back to the far end. Cards spread
// apart, grow, and angle inward as they near, then fade out into the distance.
const threed: Template = {
  meta: { id: 'threed-01', name: '3D 01', group: '3D', defaultEasing: { id: 'flow' } },

  controls: [
    { key: 'direction',    label: 'Direction',     type: 'toggle', options: ['forward','reverse'], default: 'forward' },
    { key: 'count',        label: 'Count',         type: 'slider', min: 1, max: 12, step: 1,   default: 8 },
    { key: 'wallOffset',   label: 'Wall Offset',   type: 'slider', min: 0, max: 600, step: 1,  default: 260 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 800, step: 1, default: 300 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'angle',        label: 'Angle',         type: 'slider', min: 0, max: 60, step: 1,   default: 30 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 3, step: 0.1,  default: 0.5 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const dir = v.direction === 'reverse' ? -1 : 1;
    const phase = ctx.easedPhase((frame / ctx.fps) * v.speed * dir);
    const sizeFactor = v.cardSize / BASE;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Depth slot advances toward the camera and wraps: 0 = nearest, count = farthest.
    const z = (((index - phase) % count) + count) % count;
    const depthNorm = 1 - z / count;

    // Two walls (left/right) that spread apart as cards approach.
    const side = index % 2 ? 1 : -1;
    const x = side * v.wallOffset * (0.35 + depthNorm) + v.offset.x;
    const y = v.offset.y;

    // Nearer cards are larger; angled panels via horizontal skew.
    const scale = sizeFactor * lerp(0.12, 1.35, depthNorm);
    const skewY = side * (v.angle * Math.PI / 180) * (0.5 + 0.5 * depthNorm);

    // Fade the far cards out as they wrap.
    const alpha = Math.min(1, depthNorm * 3);

    return {
      x,
      y,
      scale,
      rotation: 0,
      alpha,
      skewY,
      depth: depthNorm,
    };
  },
};

export const threedVariants: Template[] = [
  threed, // 3D 01 — classic corridor
  variant(threed, 'threed-02', '3D 02', {
    wallOffset: 380, angle: 45, speed: 0.7, count: 10,
  }),
  variant(threed, 'threed-03', '3D 03', {
    wallOffset: 160, angle: 15, speed: 0.35, count: 6,
  }),
  variant(threed, 'threed-04', '3D 04', {
    wallOffset: 480, angle: 55, speed: 1.1, count: 12,
  }),
];
