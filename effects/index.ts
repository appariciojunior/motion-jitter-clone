import type { Effect } from '@/lib/types';
import { pixelate } from './pixelate';

export const effects: Record<string, Effect> = {
  [pixelate.meta.id]: pixelate,
};

export const effectList: Effect[] = Object.values(effects);

export function getEffect(id: string): Effect | undefined {
  return effects[id];
}

export function effectDefaults(id: string): Record<string, any> {
  const e = getEffect(id);
  if (!e) return {};
  const values: Record<string, any> = {};
  for (const c of e.controls) {
    values[c.key] = typeof c.default === 'object' && c.default !== null
      ? { ...(c.default as object) }
      : c.default;
  }
  return values;
}
