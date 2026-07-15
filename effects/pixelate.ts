import type { Effect } from '@/lib/types';
import { PixelateFilter } from 'pixi-filters';

export const pixelate: Effect = {
  meta: { id: 'pixelate', name: 'Pixelate' },
  controls: [
    { key: 'size', label: 'Pixel Size', type: 'slider', min: 1, max: 64, step: 1, default: 8 },
  ],
  createFilter: (v) => new PixelateFilter(v.size ?? 8),
};
