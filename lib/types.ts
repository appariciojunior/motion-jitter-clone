import type * as PIXI from 'pixi.js';
import type { EasingSpec } from './easing';

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
}

// ----- The transform context handed to every template each frame -----
export interface TransformCtx {
  fps: number;
  width: number;
  height: number;
  // The scene's active easing curve, t∈[0,1] → y (see lib/easing).
  ease: (t: number) => number;
  // Remap a cyclic phase so each unit step is shaped by `ease`, keeping the
  // loop seamless: floor(p) + ease(frac(p)). Templates route their raw
  // (time·speed) phase through this to inherit the scene easing.
  easedPhase: (phase: number) => number;
}

// ----- A motion template (SEAM 1) -----
export interface Template {
  meta: {
    id: string; name: string; group: string; thumbnail?: string;
    defaultEasing?: EasingSpec;               // curve the template ships with
  };
  controls: ControlDef[];                     // its FULL own set
  transform: (
    frame: number,                            // absolute frame index
    index: number,                            // this layer's slot 0..count-1
    count: number,                            // total active layers
    values: Record<string, any>,              // current control values
    ctx: TransformCtx                          // canvas ctx + easing
  ) => LayerTransform;                         // PURE. no side effects.
}

// ----- An effect (SEAM 2) -----
export interface Effect {
  meta: { id: string; name: string };
  controls: ControlDef[];
  createFilter: (values: Record<string, any>) => PIXI.Filter;
}
