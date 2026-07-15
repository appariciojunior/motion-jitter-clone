import type { Template } from '@/lib/types';

const BASE = 340;

// Blank — a minimal empty starting canvas: a static, centred grid with no motion.
// The transform ignores `frame` entirely, giving a still slate to build from.
const blank: Template = {
  meta: { id: 'blank-01', name: 'Blank 01', group: 'Blank', defaultEasing: { id: 'linear' } },

  controls: [
    { key: 'count',        label: 'Count',         type: 'slider', min: 1, max: 12, step: 1,   default: 4 },
    { key: 'cols',         label: 'Columns',       type: 'slider', min: 1, max: 6, step: 1,    default: 2 },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 500, step: 1, default: 220 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 14 },
    { key: 'gap',          label: 'Gap',           type: 'slider', min: 0, max: 200, step: 1,  default: 40 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  transform: (frame, index, count, v, _ctx) => {
    const sizeFactor = v.cardSize / BASE;
    const cols = Math.max(1, Math.round(v.cols));
    const rows = Math.ceil(count / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);

    const spacingX = (v.cardSize * 0.8 + v.gap) * sizeFactor;
    const spacingY = (v.cardSize + v.gap) * sizeFactor;
    const x = (col - (cols - 1) / 2) * spacingX + v.offset.x;
    const y = (row - (rows - 1) / 2) * spacingY + v.offset.y;

    return {
      x,
      y,
      scale: sizeFactor,
      rotation: 0,
      alpha: 1,
      depth: index,
    };
  },
};

export const blankVariants: Template[] = [blank];
