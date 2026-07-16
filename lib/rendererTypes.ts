// The renderer contract the app depends on. Both the PixiJS SceneRenderer
// (2D templates) and the Three.js SceneRenderer3D (webgl templates) implement
// this, so PreviewStage / ExportDialog / rendererInstance are engine-agnostic.
export interface IRenderer {
  init(canvas: HTMLCanvasElement): Promise<void>;
  resize(width: number, height: number, resolution?: number): void;
  // Realize the scene state for a frame (no draw).
  getFrameState(frame: number): void;
  // Realize + draw a frame (preview loop and export both use this).
  renderFrame(frame: number): void;
  // Deterministic capture: realize frame, render, read pixels as PNG data URL.
  captureFrame(frame: number): string;
  // Multiply the backing-store resolution for export capture (logical size
  // unchanged, so template layout is untouched).
  setCaptureScale(k: number): void;
  syncAssets(): void;
  destroy(): void;
}
