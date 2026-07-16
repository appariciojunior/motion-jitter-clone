import type { IRenderer } from './rendererTypes';

// Module singleton so non-render components (e.g. the export dialog) can reach
// the live renderer to drive deterministic frame capture. Engine-agnostic:
// holds either the Pixi SceneRenderer or the Three SceneRenderer3D.
let current: IRenderer | null = null;

export function setRendererInstance(r: IRenderer | null) {
  current = r;
}
export function getRendererInstance(): IRenderer | null {
  return current;
}
