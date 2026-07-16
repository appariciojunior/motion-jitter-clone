import type { Template } from '@/lib/types';
import { loopCycles } from '@/lib/motion';
import { variant } from './variant';

const BASE = 340;

// Flicker — cards take turns at centre, cross-fading on a cycle. Effect adds
// a scale pop or a directional drift to the outgoing card (per the reference
// tool's Pacing / Effect / Drift controls).
const flicker: Template = {
  meta: { id: 'flicker-01', name: 'Pulse 01', group: 'Pulse', defaultEasing: { id: 'linear' } },

  controls: [
    { key: 'pacing',       label: 'Pacing',        type: 'toggle', options: ['equal','eased'], default: 'equal' },
    { key: 'effect',       label: 'Effect',        type: 'pills',  options: ['off','scale','drift'], default: 'off' },
    { key: 'driftDir',     label: 'Drift Dir',     type: 'pills',  options: ['up','down','left','right'], default: 'up' },
    { key: 'count',        label: 'Count',         type: 'slider', min: 2, max: 12, step: 1,   default: 6 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 800, step: 1, default: 420 },
    { key: 'driftAmount',  label: 'Drift Amount',  type: 'slider', min: 0, max: 200, step: 1,  default: 40 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 10 },
    { key: 'speed',        label: 'Cycles',        type: 'slider', min: 0.2, max: 6, step: 0.1, default: 1.5 }, // cards/sec
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const phase = ctx.easedPhase((frame / ctx.totalFrames) * loopCycles(v.speed, ctx.duration, count));

    // lifecycle w ∈ [0, count): 0 = this card just became active
    const w = (((phase - index) % count) + count) % count;

    // visibility: full at w=0, crossfades out over one slot; the incoming
    // neighbour fades in over the same window
    let vis = Math.max(0, 1 - w) + Math.max(0, 1 - (count - w));
    vis = Math.min(1, vis);
    if (v.pacing === 'eased') vis = vis * vis * (3 - 2 * vis); // smoothstep hold

    // outgoing progress 0→1 during the fade window
    const out = w < 1 ? w : 0;

    let dx = 0, dy = 0, scl = 1;
    if (v.effect === 'drift') {
      const d = out * v.driftAmount;
      if (v.driftDir === 'up') dy = -d;
      else if (v.driftDir === 'down') dy = d;
      else if (v.driftDir === 'left') dx = -d;
      else dx = d;
    } else if (v.effect === 'scale') {
      scl = 1 + out * 0.12;
    }

    return {
      x: v.offset.x + dx,
      y: v.offset.y + dy,
      scale: (v.cardSize / BASE) * scl,
      rotation: 0,
      alpha: vis,
      depth: vis, // active card on top
    };
  },
};

export const flickerVariants: Template[] = [
  flicker, // Flicker 01 — clean crossfade
  variant(flicker, 'flicker-02', 'Pulse 02', {
    effect: 'drift', driftDir: 'up', driftAmount: 60, pacing: 'eased', speed: 1,
  }),
];
