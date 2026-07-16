import type { Template } from '@/lib/types';

// Focal point for cover-fit cropping, both axes 0..1 (0.5/0.5 = centre).
export interface CropFocus { x: number; y: number }

export const DEFAULT_FOCUS: CropFocus = { x: 0.5, y: 0.5 };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// User-selectable card shapes (the scene-level crop aspect). 'auto' defers to
// the template's declared cardAspect (or the 4:5 default).
export const CARD_SHAPES: Record<string, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '4:3': 4 / 3,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
};

// The card shape a template lays out. Full-bleed templates ('canvas') always
// crop to the canvas aspect — a part-screen card there would leave gaps. For
// everything else the user's scene-level shape wins; 'auto' falls back to the
// template's declared cardAspect, then the 4:5 portrait default.
export function cardAspectFor(
  meta: Template['meta'],
  width: number,
  height: number,
  shape?: string,
): number {
  if (meta.cardAspect === 'canvas') return width / Math.max(1, height);
  if (shape && CARD_SHAPES[shape]) return CARD_SHAPES[shape];
  return typeof meta.cardAspect === 'number' ? meta.cardAspect : 4 / 5;
}

// Cover-fit: the largest sub-rect of a (tw × th) image with `aspect`,
// anchored by the focal point — like CSS object-fit: cover + object-position.
// Images never stretch; the excess on the longer axis is cropped away.
export function coverCrop(tw: number, th: number, aspect: number, focus?: CropFocus | null) {
  const f = focus ?? DEFAULT_FOCUS;
  let fw = tw;
  let fh = tw / aspect;
  if (fh > th) { fh = th; fw = th * aspect; }
  return {
    fx: (tw - fw) * clamp01(f.x),
    fy: (th - fh) * clamp01(f.y),
    fw,
    fh,
  };
}

// Cache key for a cropped texture (shared by both renderers).
export function cropKey(url: string, aspect: number, focus?: CropFocus | null) {
  const f = focus ?? DEFAULT_FOCUS;
  return `${url}|${aspect.toFixed(4)}|${f.x}|${f.y}`;
}
