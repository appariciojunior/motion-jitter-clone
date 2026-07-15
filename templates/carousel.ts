import type { Template } from '@/lib/types';
import { cardPath } from '@/lib/cardPath';

// Reference size (px) shared with the renderer's sprite normalization, so that
// `cardSize` reads directly in on-screen pixels.
const BASE = 340;

export const carousel: Template = {
  meta: { id: 'carousel', name: 'Carousel', group: 'Carousel', defaultEasing: { id: 'glide' } },

  controls: [
    // Four-way direction (as in the reference tool): left/right run the strip
    // horizontally, up/down run it vertically. Axis + travel sign in one control.
    { key: 'direction',    label: 'Direction',     type: 'pills', options: ['left','right','up','down'], default: 'left' },
    { key: 'count',        label: 'Count',         type: 'slider', min: 1, max: 12, step: 1,   default: 6 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 800, step: 1, default: 340 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'gap',          label: 'Gap',           type: 'slider', min: 0, max: 600, step: 1,  default: 360 }, // px between card centres (at base size)
    { key: 'bigScale',     label: 'Big Scale',     type: 'slider', min: 100, max: 200, step: 1, default: 120 }, // featured card size %
    { key: 'perspective',  label: 'Perspective',   type: 'slider', min: 0, max: 200, step: 1,  default: 0 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
    { key: 'fade',         label: 'Fade',          type: 'slider', min: 0, max: 100, step: 1,  default: 0 },   // edge fade %
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 4, step: 0.1,  default: 0.6 }, // cards/sec
  ],

  transform: (frame, index, count, v, ctx) => {
    const horiz = v.direction === 'left' || v.direction === 'right';
    const dir = (v.direction === 'left' || v.direction === 'up') ? 1 : -1;
    const phase = ctx.easedPhase((frame / ctx.fps) * v.speed * dir); // ← Speed + Direction + Easing

    // Cards recycle seamlessly (wrap). Featuredness peaks at centre.
    const p = cardPath({ kind: 'line', index, count, phase, gap: 1, wrap: true });
    const offset = p.x;                                          // gap:1 → x carries the raw signed offset
    const sizeFactor = v.cardSize / BASE;

    // pos = offset * Gap * (cardSize/BASE) → spacing grows with the card        ← Gap
    const pos = offset * v.gap * sizeFactor;
    const x = (horiz ? pos : 0) + v.offset.x;                    // ← Offset X
    const y = (horiz ? 0 : pos) + v.offset.y;                    // ← Offset Y

    // Featured card grows toward Big Scale; others sit at 1.0                    ← Big Scale
    let scale = sizeFactor * (1 + (v.bigScale / 100 - 1) * p.featuredness);      // ← Plane Size

    // Perspective: off-centre cards shrink and skew away from centre, along
    // the travel axis (skewX for horizontal strips, skewY for vertical).       ← Perspective
    const persp = v.perspective / 100;
    scale *= 1 - (1 - p.depthNorm) * 0.35 * persp;
    const skew = -Math.sign(offset) * (1 - p.depthNorm) * 0.18 * persp;

    // Edge fade                                                                  ← Fade
    const alpha = 1 - (v.fade / 100) * (1 - p.depthNorm);

    return {
      x,
      y,
      scale,
      rotation: 0,
      alpha,
      skewX: horiz ? skew : 0,
      skewY: horiz ? 0 : skew,
      depth: p.depthNorm,                                        // draw nearer cards on top
    };
    // cornerRadius is applied where the sprite mask is built, not here.          ← Corner Radius
  },
};
