import type { Template } from '@/lib/types';

// A variant is the same template (controls + transform) shipped with different
// declared defaults — mirroring the reference tool's "Wheel 01…06" presets.
// Full-reset-on-switch then produces the preset look for free.
export function variant(
  base: Template,
  id: string,
  name: string,
  patch: Record<string, any> = {}
): Template {
  return {
    meta: { ...base.meta, id, name },
    controls: base.controls.map((c) =>
      patch[c.key] !== undefined ? { ...c, default: patch[c.key] } : c
    ),
    transform: base.transform,
  };
}
