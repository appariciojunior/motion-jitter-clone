import type { Template } from '@/lib/types';
import { completeTemplateList } from './catalog';

// Verified against the live Arqé Singles catalogue: 25 families, 189 presets.
export const templateList: Template[] = completeTemplateList;

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
  return templates[id] ?? templateList[0];
}

// Build the initial value bag from a template's declared defaults.
export function defaultsFor(id: string): Record<string, any> {
  const t = getTemplate(id);
  const values: Record<string, any> = {};
  for (const [key, value] of Object.entries(t.meta.defaults ?? {})) {
    values[key] = typeof value === 'object' && value !== null
      ? { ...(value as object) }
      : value;
  }
  for (const c of t.controls) {
    // clone objects (xypad) so state is never shared by reference
    values[c.key] = typeof c.default === 'object' && c.default !== null
      ? { ...(c.default as object) }
      : c.default;
  }

  // Keep timing presets consistent. Carousel/Stack expose stagger/delay as
  // frames in the panel, but store them as seconds internally.
  if ('cycles' in values) values.cycles = 1;
  if ('duration' in values) values.duration = 1.6;
  if ('delay' in values) values.delay = 0;
  const staggerControl = t.controls.find((c) => c.key === 'stagger');
  if ('stagger' in values && staggerControl?.display === 'frames') values.stagger = 2 / 30;
  return values;
}
