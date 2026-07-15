import type { SceneRenderer } from './renderer';

// Module singleton so non-Pixi components (e.g. the export dialog) can reach
// the live renderer to drive deterministic frame capture.
let current: SceneRenderer | null = null;

export function setRendererInstance(r: SceneRenderer | null) {
  current = r;
}
export function getRendererInstance(): SceneRenderer | null {
  return current;
}
