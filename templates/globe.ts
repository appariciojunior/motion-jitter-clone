import type { Template } from '@/lib/types';
import { variant } from './variant';

const BASE = 340;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Globe — images tiled evenly over a slowly spinning sphere (Fibonacci
// distribution). Front tiles sit large and opaque; rear tiles shrink and fade.
const globe: Template = {
  meta: { id: 'globe-01', name: 'Globe 01', group: 'Globe', defaultEasing: { id: 'linear' } },

  controls: [
    { key: 'direction',    label: 'Direction',     type: 'toggle', options: ['forward','reverse'], default: 'forward' },
    { key: 'count',        label: 'Count',         type: 'slider', min: 6, max: 60, step: 1,   default: 36 },
    { key: 'radius',       label: 'Radius',        type: 'slider', min: 100, max: 700, step: 1, default: 420 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 20, max: 300, step: 1, default: 120 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 3, step: 0.1,  default: 0.4 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const dir = v.direction === 'reverse' ? -1 : 1;
    const t = (frame / ctx.fps) * v.speed * dir;
    const sizeFactor = v.cardSize / BASE;

    // Fibonacci sphere: even latitude bands, golden-angle longitude + spin.
    const gold = Math.PI * (3 - Math.sqrt(5));
    const lat = Math.asin(-1 + 2 * (index + 0.5) / count);
    const lon = index * gold + t * Math.PI * 2;

    const cx = Math.cos(lat) * Math.sin(lon);
    const cz = Math.cos(lat) * Math.cos(lon);
    const cy = Math.sin(lat);

    const x = cx * v.radius + v.offset.x;
    const y = cy * v.radius + v.offset.y;
    const depthN = (cz + 1) / 2; // 1 = front, 0 = back

    const scale = sizeFactor * lerp(0.3, 1.15, depthN);
    const alpha = lerp(0.12, 1, depthN);

    return {
      x,
      y,
      scale,
      rotation: 0,
      alpha,
      depth: depthN,
    };
  },
};

export const globeVariants: Template[] = [
  globe, // Globe 01 — full sphere
  variant(globe, 'globe-02', 'Globe 02', {
    count: 24, radius: 300, cardSize: 150,
  }),
  variant(globe, 'globe-03', 'Globe 03', {
    count: 60, radius: 560, cardSize: 90,
  }),
  variant(globe, 'globe-04', 'Globe 04', {
    count: 48, radius: 680, cardSize: 110, speed: 0.7,
  }),
];
