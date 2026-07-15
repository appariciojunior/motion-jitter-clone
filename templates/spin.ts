import type { Template } from '@/lib/types';

const BASE = 340;

// Spin — one card (or a small fanned stack) rotating in place at centre.
// Sway swaps continuous rotation for a pendulum.
export const spin: Template = {
  meta: { id: 'spin-01', name: 'Spin 01', group: 'Spin' },

  controls: [
    { key: 'direction',    label: 'Direction',     type: 'toggle', options: ['forward','reverse'], default: 'forward' },
    { key: 'sway',         label: 'Sway',          type: 'toggle', options: ['off','on'], default: 'off' },
    { key: 'count',        label: 'Count',         type: 'slider', min: 1, max: 8, step: 1,    default: 1 },
    { key: 'fanAngle',     label: 'Fan Angle',     type: 'slider', min: 0, max: 90, step: 1,   default: 14 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 800, step: 1, default: 380 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 2, step: 0.05, default: 0.25 }, // revs/sec
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const dir = v.direction === 'reverse' ? -1 : 1;
    const t = (frame / ctx.fps) * v.speed * dir;

    const base = v.sway === 'on'
      ? Math.sin(t * Math.PI * 2) * 0.4          // pendulum ±23°
      : t * Math.PI * 2;                          // continuous revolution

    // extra cards fan behind the lead card
    const fan = (index - (count - 1) / 2) * (v.fanAngle * Math.PI / 180);

    return {
      x: v.offset.x,
      y: v.offset.y,
      scale: (v.cardSize / BASE) * (1 - index * 0.04),
      rotation: base + fan,
      alpha: 1,
      depth: count - index, // lead card on top
    };
  },
};

export const spinVariants: Template[] = [spin];
