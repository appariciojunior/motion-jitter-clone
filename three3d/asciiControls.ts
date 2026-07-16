import type { ControlDef } from '@/lib/types';

// ── ASCII effect control schema ─────────────────────────────────────────────
// Grouped controls for the 3D-mode right panel. Same 8-type vocabulary as the
// 2D templates (lib/types). Booleans use `toggle` with ['On','Off'] and store
// the string. The ASCII renderer + the 3D stage overlays read these live.

export interface ControlGroup {
  title: string;
  controls: ControlDef[];
}

// Character ramps: dark → bright. First glyph is "empty".
export const CHAR_SETS: Record<string, string> = {
  Detailed: ' .·:;!|10Oo°•@█▓',
  Standard: ' .:-=+*#%@',
  Blocks: ' ░▒▓█',
  Dots: ' .·•●',
  Binary: ' 01',
};

export const asciiGroups: ControlGroup[] = [
  {
    title: 'Characters',
    controls: [
      { key: 'fontSize', label: 'Font Size', type: 'slider', min: 4, max: 16, step: 1, default: 8 },
      // Global character density — raises glyph count across the whole screen
      // (model + ambient) by tightening the grid pitch. Higher = more chars.
      { key: 'gridDensity', label: 'Density', type: 'slider', min: 0, max: 100, step: 1, default: 67 },
      { key: 'charSetCustom', label: 'Character Set', type: 'text', default: ' .·:-=+*oaeC8%@#' },
      { key: 'blendMode', label: 'Blend Mode', type: 'select', options: ['normal', 'screen', 'lighten', 'overlay', 'color-dodge'], default: 'normal' },
      { key: 'charOpacity', label: 'Char Opacity', type: 'slider', min: 0, max: 100, step: 1, default: 100 },
      { key: 'invertMapping', label: 'Invert Mapping', type: 'toggle', options: ['On', 'Off'], default: 'Off' },
      { key: 'dotGrid', label: 'Dot Grid Overlay', type: 'toggle', options: ['On', 'Off'], default: 'Off' },
      { key: 'randomize', label: 'Randomize Characters', type: 'toggle', options: ['On', 'Off'], default: 'On' },
    ],
  },
  {
    title: 'Model',
    controls: [
      // Threshold/edge detection over the 3D model — isolates its lines.
      { key: 'edges', label: 'Line Mode (Threshold)', type: 'toggle', options: ['On', 'Off'], default: 'Off' },
      // Higher = more lines / more detail; lower = only the strongest edges.
      { key: 'threshold', label: 'Threshold Detail', type: 'slider', min: 0, max: 100, step: 1, default: 60 },
      // Posterize (fill mode): quantise luminance into N bands. More bands =
      // more character-size intervals = more tonal volume/steps.
      { key: 'levels', label: 'Posterize Levels', type: 'slider', min: 2, max: 24, step: 1, default: 10 },
    ],
  },
  {
    title: 'Intensity',
    controls: [
      { key: 'coverage', label: 'Coverage', type: 'slider', min: 0, max: 100, step: 1, default: 85 },
      { key: 'edgeEmphasis', label: 'Edge Emphasis', type: 'slider', min: 0, max: 100, step: 1, default: 0 },
      { key: 'density', label: 'Fill Density', type: 'slider', min: 0, max: 100, step: 1, default: 30 },
      { key: 'brightness', label: 'Brightness', type: 'slider', min: -100, max: 100, step: 1, default: 0 },
      { key: 'contrast', label: 'Contrast', type: 'slider', min: 0, max: 200, step: 1, default: 125 },
    ],
  },
  {
    title: 'Background',
    controls: [
      // Solid background colour (separate from the ASCII tint).
      { key: 'bgColor', label: 'Background Color', type: 'color', default: '#0d1408' },
      // Fill the empty background with a value-noise (fBm) ASCII texture —
      // Blender-style height map: dark→bright noise picks the glyph. Model
      // always draws on top (per-cell), so no background chars leak through it.
      { key: 'bgTexture', label: 'Noise Texture', type: 'toggle', options: ['On', 'Off'], default: 'On' },
      { key: 'bgSeed', label: 'Noise Seed', type: 'slider', min: 0, max: 999, step: 1, default: 42 },
      { key: 'bgScale', label: 'Noise Scale', type: 'slider', min: 1, max: 100, step: 1, default: 30 },
      // Higher coverage = more of the background filled with characters.
      { key: 'bgCoverage', label: 'Noise Coverage', type: 'slider', min: 0, max: 100, step: 1, default: 55 },
    ],
  },
  {
    title: 'Animation',
    controls: [
      { key: 'animated', label: 'Animated ASCII', type: 'toggle', options: ['On', 'Off'], default: 'On' },
    ],
  },
  {
    title: 'Lights',
    controls: [
      { key: 'enableLights', label: 'Enable Lights', type: 'toggle', options: ['On', 'Off'], default: 'On' },
      { key: 'enableMask', label: 'Enable Mask', type: 'toggle', options: ['On', 'Off'], default: 'On' },
    ],
  },
  {
    title: 'Tint',
    controls: [
      { key: 'tint', label: 'Tint', type: 'color', default: '#00ff41' },
      { key: 'tintOpacity', label: 'Tint Opacity', type: 'slider', min: 0, max: 100, step: 1, default: 38 },
      { key: 'blend', label: 'Blend', type: 'select', options: ['normal', 'hue', 'color', 'screen', 'overlay', 'luminosity'], default: 'hue' },
      { key: 'saturation', label: 'Saturation', type: 'slider', min: 0, max: 200, step: 1, default: 100 },
      { key: 'grayscale', label: 'Grayscale', type: 'slider', min: 0, max: 100, step: 1, default: 15 },
    ],
  },
  {
    title: 'Post-Processing',
    controls: [
      { key: 'vignette', label: 'Vignette', type: 'slider', min: 0, max: 100, step: 1, default: 60 },
    ],
  },
];

// Flat default map from all groups.
export function asciiDefaults(): Record<string, any> {
  const v: Record<string, any> = {};
  for (const g of asciiGroups) for (const c of g.controls) v[c.key] = c.default;
  return v;
}

export function isOn(v: any): boolean {
  return v === 'On' || v === true;
}
