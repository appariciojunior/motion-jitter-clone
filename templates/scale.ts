import type { Template } from '@/lib/types';
import { variant } from './variant';

// Scale — a Ken-Burns zoom slideshow. One image at a time pushes IN (or
// pulls OUT) from a chosen anchor, cross-fading to the next with a stagger,
// plus an optional slight spin. The custom expo-out curve gives an instant
// fast start and a long deceleration.
const BASE = 340;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const scale: Template = {
  meta: { id: 'scale-01', name: 'Scale 01', group: 'Scale', defaultEasing: { id: 'custom', bezier: [0, 0, 0, 0.99] } },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 2, max: 10, step: 1,    default: 5 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 600, step: 1,  default: 340 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,   default: 0 },
    { key: 'zoom',         label: 'Zoom',          type: 'slider', min: 0, max: 80, step: 1,    default: 30 },
    { key: 'direction',    label: 'Direction',     type: 'pills',  options: ['in','out'],       default: 'in' },
    { key: 'anchor',       label: 'Anchor',        type: 'pills',  options: ['center','tl','tr','bl','br'], default: 'center' },
    { key: 'spin',         label: 'Spin',          type: 'toggle', options: ['on','off'],       default: 'off' },
    { key: 'spinAmt',      label: 'Spin Amount',   type: 'slider', min: 0, max: 30, step: 1,    default: 6 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0.2, max: 3, step: 0.1, default: 0.5 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                               default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const sizeFactor = v.cardSize / BASE;

    // lifecycle w ∈ [0, count): 0 = this card just became active
    const phase = (frame / ctx.fps) * v.speed;
    const w = (((phase - index) % count) + count) % count;

    // crossfade over one slot at each end
    let vis = Math.max(0, 1 - w) + Math.max(0, 1 - (count - w));
    vis = Math.min(1, vis);

    // eased zoom progress across the active card's visible cycle
    const age = w / count; // 0 → 1 while this is the current image
    const z = ctx.ease(age);

    const zoomAmt = v.zoom / 100;
    const s = v.direction === 'out' ? lerp(1 + zoomAmt, 1, z) : lerp(1, 1 + zoomAmt, z);
    // near full-frame Ken-Burns fit
    const scl = sizeFactor * (ctx.height / BASE) * 0.9 * s;

    // anchor pan: shift toward the chosen corner as it zooms
    const ax = v.anchor.includes('l') ? -1 : v.anchor.includes('r') ? 1 : 0;
    const ay = v.anchor.startsWith('t') ? -1 : v.anchor.startsWith('b') ? 1 : 0;
    const x = -ax * (s - 1) * v.cardSize * 0.6 + v.offset.x;
    const y = -ay * (s - 1) * v.cardSize * 0.6 + v.offset.y;

    const rotation = v.spin === 'on' ? (z - 0.5) * (v.spinAmt * Math.PI / 180) : 0;

    return {
      x,
      y,
      scale: scl,
      rotation,
      alpha: vis,
      depth: vis,
    };
  },
};

export const scaleVariants: Template[] = [
  scale,
  variant(scale, 'scale-02', 'Scale 02', { anchor: 'tl', direction: 'in', zoom: 45 }),
  variant(scale, 'scale-03', 'Scale 03', { anchor: 'br', direction: 'out', zoom: 55 }),
  variant(scale, 'scale-04', 'Scale 04', { anchor: 'center', direction: 'in', zoom: 20, spin: 'on', spinAmt: 10 }),
];
