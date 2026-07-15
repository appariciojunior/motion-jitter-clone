import type * as PIXI from 'pixi.js';

// ----- Control vocabulary. Templates may ONLY use these types. -----
export type ControlType =
  | 'slider'   // numeric, inline editable value.  needs min,max,step
  | 'toggle'   // two-state segmented (Forward/Reverse, On/Off)
  | 'pills'    // single-select option row.         needs options[]
  | 'select'   // dropdown.                         needs options[]
  | 'color'    // hex string
  | 'xypad'    // {x,y}
  | 'upload'   // file/url
  | 'text';    // string

export interface ControlDef {
  key: string;                 // unique within the template
  label: string;               // shown in panel
  type: ControlType;
  min?: number; max?: number; step?: number;  // slider
  options?: string[];          // pills / select / toggle
  default: number | string | boolean | { x: number; y: number };
  section?: string;            // Scene / Timing / family-specific subsection
  unit?: string;               // display unit such as f (frames), s, or %
  display?: 'frames';          // value is stored in seconds but edited/displayed as frames
}

export interface CubicBezier {
  h1x: number;
  h1y: number;
  h2x: number;
  h2y: number;
}

export interface TransformContext {
  fps: number;
  width: number;
  height: number;
  progress?: number; // timing + easing adjusted, normalized to 0..1
  elapsed?: number;
}

// ----- What a template's transform returns for ONE layer at ONE frame -----
export interface LayerTransform {
  x: number;         // px, canvas centre = 0,0
  y: number;
  scale: number;     // 1 = native
  rotation: number;  // radians
  alpha: number;     // 0..1
  skewX?: number;    // optional, for fake-3D tilt
  skewY?: number;
  depth: number;     // sort order; higher = drawn on top / nearer
  order?: number;    // optional tie-break; lets cyclic scenes avoid static index layering
}

// ----- A motion template (SEAM 1) -----
export interface Template {
  meta: {
    id: string;
    name: string;
    group: string;
    thumbnail?: string;
    baseMode?: string;
    easing?: CubicBezier;
    defaults?: Record<string, any>;
  };
  controls: ControlDef[];                     // its FULL own set
  transform: (
    frame: number,                            // absolute frame index
    index: number,                            // this layer's slot 0..count-1
    count: number,                            // total active layers
    values: Record<string, any>,              // current control values
    ctx: TransformContext                         // canvas + normalized timing
  ) => LayerTransform;                         // PURE. no side effects.
}

// ----- An effect (SEAM 2) -----
export interface Effect {
  meta: { id: string; name: string };
  controls: ControlDef[];
  createFilter: (values: Record<string, any>) => PIXI.Filter;
}
