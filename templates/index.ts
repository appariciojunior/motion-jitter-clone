import type { Template } from '@/lib/types';
import { DEFAULT_EASING, type EasingSpec } from '@/lib/easing';
import { carousel } from './carousel';
import { variant } from './variant';
import { wheelVariants } from './wheel';
import { orbitVariants } from './orbit';
import { stackVariants } from './stack';
import { storiesVariants } from './stories';
import { spinVariants } from './spin';
import { flickerVariants } from './flicker';
import { gridVariants } from './grid';
import { threedVariants } from './threed';
import { fieldVariants } from './field';
import { wipeVariants } from './wipe';
import { globeVariants } from './globe';
import { coverflowVariants } from './coverflow';
import { spiralVariants } from './spiral';
import { tourVariants } from './tour';
import { magazineVariants } from './magazine';
import { gravityVariants } from './gravity';
import { parallaxVariants } from './parallax';
import { deckVariants } from './deck';
import { flipVariants } from './flip';
import { marqueeVariants } from './marquee';
import { scaleVariants } from './scale';
import { proximityVariants } from './proximity';
import { framesVariants } from './frames';
import { blankVariants } from './blank';

const carouselVariants: Template[] = [
  { ...carousel, meta: { ...carousel.meta, name: 'Carousel 01' } },
  variant(carousel, 'carousel-02', 'Carousel 02', {
    gap: 140, bigScale: 145, perspective: 0, fade: 45, speed: 0.4,
  }),
];

// Order follows the reference catalogue's sidebar.
export const templateList: Template[] = [
  ...carouselVariants,
  ...orbitVariants,
  ...stackVariants,
  ...threedVariants,
  ...wheelVariants,
  ...fieldVariants,
  ...wipeVariants,
  ...storiesVariants,
  ...spinVariants,
  ...flickerVariants,
  ...globeVariants,
  ...coverflowVariants,
  ...gridVariants,
  ...spiralVariants,
  ...tourVariants,
  ...magazineVariants,
  ...gravityVariants,
  ...parallaxVariants,
  ...deckVariants,
  ...flipVariants,
  ...marqueeVariants,
  ...scaleVariants,
  ...proximityVariants,
  ...framesVariants,
  ...blankVariants,
];

export const templates: Record<string, Template> = Object.fromEntries(
  templateList.map((t) => [t.meta.id, t])
);

// Group order follows the reference catalogue.
export const templateGroups: { group: string; items: Template[] }[] = (() => {
  const order: string[] = [];
  const map = new Map<string, Template[]>();
  for (const t of templateList) {
    if (!map.has(t.meta.group)) { map.set(t.meta.group, []); order.push(t.meta.group); }
    map.get(t.meta.group)!.push(t);
  }
  return order.map((group) => ({ group, items: map.get(group)! }));
})();

export function getTemplate(id: string): Template {
  return templates[id] ?? carousel;
}

// Build the initial value bag from a template's declared defaults.
export function defaultsFor(id: string): Record<string, any> {
  const t = getTemplate(id);
  const values: Record<string, any> = {};
  for (const c of t.controls) {
    // clone objects (xypad) so state is never shared by reference
    values[c.key] = typeof c.default === 'object' && c.default !== null
      ? { ...(c.default as object) }
      : c.default;
  }
  return values;
}

// The easing curve a template ships with (falls back to linear).
export function easingFor(id: string): EasingSpec {
  const spec = getTemplate(id).meta.defaultEasing ?? DEFAULT_EASING;
  return { ...spec }; // clone so state never shares the preset reference
}
