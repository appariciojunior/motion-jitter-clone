import type { Template } from '@/lib/types';
import { smooth, lerp, loopCycles } from '@/lib/motion';
import { variant } from './variant';

const BASE = 340;

// Stories Focus — an Instagram-stories layout: one large focus frame plus a
// tray of thumbnails. A selector steps through the tray; the active thumbnail
// scales and drifts up into the big frame while the others dim.
//
// Single-transform trick: every slot has a fixed TRAY pose; its activation
// f∈[0,1] (wrap-folded distance from the stepping selector) blends the pose
// toward the shared BIG-FRAME pose. At the count→0 wrap the outgoing and
// incoming cards cross-blend, so the loop is seamless.
const storiesFocus: Template = {
  meta: { id: 'stories-03', name: 'Spotlight 03', group: 'Spotlight', defaultEasing: { id: 'snap' } },

  controls: [
    { key: 'count',        label: 'Count',          type: 'slider', min: 3, max: 10, step: 1,   default: 5 },
    { key: 'bigScale',     label: 'Big Scale',      type: 'slider', min: 100, max: 200, step: 1, default: 115 }, // % of the base big-frame size
    { key: 'bigDrift',     label: 'Big Drift',      type: 'slider', min: 0, max: 200, step: 1,  default: 40 },  // px the big frame drifts as the selector passes
    { key: 'thumbSize',    label: 'Thumb Size',     type: 'slider', min: 40, max: 200, step: 1, default: 85 },
    { key: 'gap',          label: 'Tray Gap',       type: 'slider', min: 0, max: 120, step: 1,  default: 18 },
    { key: 'dimAmount',    label: 'Dim',            type: 'slider', min: 0, max: 100, step: 1,  default: 20 },  // inactive thumb dimming %
    { key: 'trayDirection',label: 'Tray Direction', type: 'pills', options: ['right','left','down','up'], default: 'right' },
    { key: 'cornerRadius', label: 'Corner Radius',  type: 'slider', min: 0, max: 100, step: 1,  default: 16 },
    { key: 'speed',        label: 'Speed',          type: 'slider', min: 0.1, max: 2, step: 0.1, default: 0.4 }, // steps/sec
    { key: 'offset',       label: 'Offset',         type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    // selector phase steps through the tray; period = count so textures return
    const phase = ctx.easedPhase((frame / ctx.totalFrames) * loopCycles(v.speed, ctx.duration, count));

    // wrapped signed distance from the selector; f = activation 0..1
    let off = (((index - phase) % count) + count) % count;
    if (off > count / 2) off -= count;
    const f = smooth(Math.max(0, 1 - Math.abs(off)));

    const horiz = v.trayDirection === 'right' || v.trayDirection === 'left';
    const sgn = (v.trayDirection === 'right' || v.trayDirection === 'down') ? 1 : -1;

    // fixed tray along the bottom edge (horiz) or right edge (vertical)
    const step = v.thumbSize + v.gap;
    const trayMain = sgn * (index - (count - 1) / 2) * step;
    const trayX = horiz ? trayMain : ctx.width * 0.32;
    const trayY = horiz ? ctx.height * 0.32 : trayMain;

    // big frame pose: upper-centre (horiz tray) / centre-left (vertical tray),
    // drifting through as the selector hands over (off runs 1 → -1)
    const bigSize = Math.min(ctx.width, ctx.height) * 0.55 * (v.bigScale / 100);
    const bigX = (horiz ? 0 : -ctx.width * 0.08) - off * v.bigDrift * (horiz ? 1 : 0);
    const bigY = (horiz ? -ctx.height * 0.10 : 0) - off * v.bigDrift * (horiz ? 0 : 1);

    const x = lerp(trayX, bigX, f) + v.offset.x;
    const y = lerp(trayY, bigY, f) + v.offset.y;
    const scale = lerp(v.thumbSize / BASE, bigSize / BASE, f);
    const alpha = lerp(1 - v.dimAmount / 100, 1, f); // inactive thumbs dim

    return { x, y, scale, rotation: 0, alpha, depth: f }; // active card on top
  },
};

export const storiesFocusVariants: Template[] = [
  storiesFocus,
  variant(storiesFocus, 'stories-04', 'Spotlight 04', {
    trayDirection: 'down', bigScale: 160, dimAmount: 45, thumbSize: 70, gap: 12,
  }),
];
