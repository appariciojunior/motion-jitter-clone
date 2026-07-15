import type { Template } from '@/lib/types';
import { variant } from './variant';

// Deck — a front-to-back card column with perspective. The front (two-sided)
// card flips on its Y-axis and slides off while the card behind scales up into
// focus; the back card fades in as it wraps around.
const BASE = 340;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

const deck: Template = {
  meta: { id: 'deck-01', name: 'Deck 01', group: 'Deck', defaultEasing: { id: 'flow' } },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 2, max: 10, step: 1,   default: 5 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 700, step: 1, default: 340 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'stackGap',     label: 'Stack Gap',     type: 'slider', min: 0, max: 40, step: 1,   default: 12 },
    { key: 'slideOff',     label: 'Slide Off',     type: 'slider', min: 0, max: 500, step: 1,  default: 260 },
    { key: 'lift',         label: 'Lift',          type: 'slider', min: 0, max: 300, step: 1,  default: 120 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0.2, max: 4, step: 0.1, default: 0.8 }, // cards/sec
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const sizeFactor = v.cardSize / BASE;
    const phase = ctx.easedPhase((frame / ctx.fps) * v.speed);

    // lifecycle w ∈ [0, count): 0 = this card just became the front one
    const w = (((phase - index) % count) + count) % count;

    // slot depth in the stack (front sits at s=0, deeper cards fan upward)
    const s = clamp(w, 0, 5);
    const scale = sizeFactor * (1 - s * 0.05);
    const baseX = v.offset.x;
    const baseY = -s * v.stackGap + v.offset.y;

    let x = baseX;
    let y = baseY;
    let scaleX = 1;
    let alpha = 1;

    if (w < 1) {
      // FRONT card leaving: flips on its Y-axis, lifts and slides off
      const f = clamp(w, 0, 1);
      scaleX = Math.abs(Math.cos(f * Math.PI));
      x = baseX + f * v.slideOff;
      y = baseY - f * v.lift;
      alpha = 1 - Math.max(0, f - 0.5) * 2; // fade out over the 2nd half
    } else {
      // stacked cards hold; the wrapping card fades in at the very back
      alpha = clamp((count - w) / 1.2, 0, 1);
    }

    return {
      x,
      y,
      scale,
      rotation: 0,
      alpha,
      scaleX,
      depth: count - w, // front card on top
    };
  },
};

export const deckVariants: Template[] = [
  deck, // Deck 01 — balanced perspective column
  variant(deck, 'deck-02', 'Deck 02', {
    stackGap: 22, slideOff: 340, lift: 40, speed: 1.1,
  }),
  variant(deck, 'deck-03', 'Deck 03', {
    count: 7, stackGap: 6, slideOff: 180, lift: 220, speed: 0.6,
  }),
];
