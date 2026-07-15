import type { Template } from '@/lib/types';

const BASE = 340;
const TEX_RATIO = 480 / 600; // placeholder/card width:height

// Grid — a static lattice of cards with a travelling scale pulse.
export const grid: Template = {
  meta: { id: 'grid-01', name: 'Grid 01', group: 'Grid' },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 2, max: 12, step: 1,   default: 9 },
    { key: 'cols',         label: 'Columns',       type: 'slider', min: 1, max: 6, step: 1,    default: 3 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 500, step: 1, default: 200 },
    { key: 'gap',          label: 'Gap',           type: 'slider', min: 0, max: 300, step: 1,  default: 40 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 14 },
    { key: 'pulse',        label: 'Pulse',         type: 'slider', min: 0, max: 60, step: 1,   default: 14 },
    { key: 'speed',        label: 'Wave Speed',    type: 'slider', min: 0, max: 3, step: 0.1,  default: 0.8 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, ctx) => {
    const cols = Math.max(1, Math.round(v.cols));
    const rows = Math.ceil(count / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const sizeFactor = v.cardSize / BASE;

    // px between cell centres (card display size is cardSize px, width × ratio)
    const spacingX = v.cardSize * TEX_RATIO + v.gap;
    const spacingY = v.cardSize + v.gap;

    const x = (col - (cols - 1) / 2) * spacingX;
    const y = (row - (rows - 1) / 2) * spacingY;

    // travelling wave: diagonal phase offset per cell
    const t = (frame / ctx.fps) * v.speed;
    const wave = Math.sin((t + (col + row) * 0.35) * Math.PI * 2);
    const scale = sizeFactor * (1 + (v.pulse / 100) * 0.5 * wave);

    return {
      x: x + v.offset.x,
      y: y + v.offset.y,
      scale,
      rotation: 0,
      alpha: 1,
      depth: index,
    };
  },
};

export const gridVariants = [grid];
