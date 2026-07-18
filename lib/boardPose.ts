// ============================================================
//  BOARD MODE — THE STATIC ARRANGEMENT (layer 1 of the compose stack)
//  A frame-independent arrangement of the board's cards, authored with the
//  same slider vocabulary the animation templates use (tilt / rotate /
//  perspective / gap / scale). It is the *resting* pose: with motion off it is
//  the whole picture, and with an animation on it is the base the motion is
//  added on top of (see composedPose in lib/boardCompose).
//
//  Every value is addressable per slot via `perCard`, even though this first
//  stage only sets the group values. That is deliberate: the next stage layers
//  per-card hover interactions on top, and they must be able to move ONE card
//  without the group arrangement being rewritten — the mistake that flattens
//  detail when a block-wide instruction owns every card.
//
//  This lives apart from the Web spike on purpose: it is its own mode.
// ============================================================

import type { LayerTransform, ControlDef } from './types';

// A board pose is a LayerTransform plus DOM-only true-3D fields. The Pixi/web
// pipelines never see it; only the board's own CSS mapping reads the extras.
export interface BoardTransform extends LayerTransform {
  rotateX?: number;      // radians, tilt about the horizontal axis
  rotateY?: number;      // radians, tilt about the vertical axis
  perspective?: number;  // px; the CSS perspective the 3D tilt is seen through
  // The animation's motion, to be applied INSIDE the tilted plane (after the 3D
  // rotates) rather than in flat screen space — so a template's slide follows
  // the plane the board tilted the cards onto. Set by composedPose.
  motionX?: number;
  motionY?: number;
}

export type Arrangement = 'row' | 'fan' | 'stack' | 'grid';

export interface BoardValues {
  arrangement: Arrangement;
  front: 'first' | 'last'; // which card sits on top of the stack (z-order)
  gapX: number;         // px horizontal spacing / step between cards
  gapY: number;         // px vertical step per card — a positive value staircases them
  cols: number;         // grid columns
  rotate: number;       // deg — per-card spread (fan) or uniform tilt (row/stack/grid)
  tiltX: number;        // deg — uniform 3D tilt about the horizontal axis
  tiltY: number;        // deg — uniform 3D tilt about the vertical axis
  perspective: number;  // px — CSS perspective the 3D tilt is seen through (0 = flat)
  scale: number;        // uniform card scale
  offset: { x: number; y: number };  // whole-board nudge
}

// Per-slot override: any subset of the group values, applied on top for card i.
export type BoardPerCard = Record<number, Partial<BoardValues>>;

export const BOARD_DEFAULTS: BoardValues = {
  arrangement: 'row',
  front: 'last',
  gapX: 40,
  gapY: 0,
  cols: 3,
  rotate: 0,
  tiltX: 0,
  tiltY: 0,
  perspective: 0,
  scale: 1,
  offset: { x: 0, y: 0 },
};

// The board's controls, rendered by the same ControlRow the templates use.
export const BOARD_CONTROLS: ControlDef[] = [
  { key: 'arrangement', label: 'Arrangement', type: 'pills', options: ['row', 'fan', 'stack', 'grid'], default: 'row' },
  { key: 'front',       label: 'Front',       type: 'toggle', options: ['first', 'last'], default: 'last' },
  { key: 'gapX',        label: 'Gap X',       type: 'slider', min: -300, max: 400, step: 1, default: 40 },
  { key: 'gapY',        label: 'Gap Y',       type: 'slider', min: -300, max: 400, step: 1, default: 0 },
  { key: 'cols',        label: 'Columns',     type: 'slider', min: 1, max: 6, step: 1,     default: 3 },
  { key: 'rotate',      label: 'Rotate',      type: 'slider', min: -180, max: 180, step: 1, default: 0 },
  { key: 'tiltX',       label: 'Tilt X',      type: 'slider', min: -80, max: 80, step: 1,  default: 0 },
  { key: 'tiltY',       label: 'Tilt Y',      type: 'slider', min: -80, max: 80, step: 1,  default: 0 },
  { key: 'perspective', label: 'Perspective', type: 'slider', min: 0, max: 2000, step: 10, default: 0 },
  { key: 'scale',       label: 'Scale',       type: 'slider', min: 0.1, max: 3, step: 0.05, default: 1 },
  { key: 'offset',      label: 'Offset',      type: 'xypad',                                default: { x: 0, y: 0 } },
];

const DEG = Math.PI / 180;

// A nominal per-card footprint, so `gap` reads as a space between cards rather
// than a raw coordinate step. The board doesn't know the real card size (that
// lives in the DOM), so the arrangements share this nominal width.
const CARD = 240;

// Merge the group values with a slot's override (the next stage populates perCard).
function valuesForSlot(board: BoardValues, perCard: BoardPerCard | undefined, i: number): BoardValues {
  const o = perCard?.[i];
  return o ? { ...board, ...o, offset: { ...board.offset, ...(o.offset ?? {}) } } : board;
}

// Pure, frame-independent. Returns where card `i` rests and how it is tilted.
export function boardPose(
  i: number,
  count: number,
  board: BoardValues,
  perCard?: BoardPerCard,
): BoardTransform {
  const v = valuesForSlot(board, perCard, i);
  const n = Math.max(1, count);
  const mid = (n - 1) / 2;

  // z-order: 'last' keeps the natural order (card i on top of card i-1); 'first'
  // flips it so card 0 sits on top. Only the stacking order changes — every
  // card's position/tilt is untouched.
  let x = 0, y = 0, rotation = 0, depth = v.front === 'first' ? (n - 1 - i) : i;

  switch (v.arrangement) {
    case 'row': {
      // horizontal spacing from gapX; gapY steps each card down → a staircase.
      x = (i - mid) * (CARD * v.scale + v.gapX);
      y = (i - mid) * v.gapY;
      rotation = v.rotate * DEG;
      break;
    }
    case 'fan': {
      // cards pivot around a low centre, spread by `rotate` degrees each.
      const a = (i - mid) * v.rotate * DEG;
      const radius = CARD * 1.6 * v.scale + v.gapX;
      x = Math.sin(a) * radius;
      y = (1 - Math.cos(a)) * radius + (i - mid) * v.gapY;
      rotation = a;
      break;
    }
    case 'stack': {
      // an offset pile: each card nudged by gapX/gapY and rotated off the last.
      x = (i - mid) * v.gapX;
      y = (i - mid) * v.gapY;
      rotation = (i - mid) * v.rotate * DEG;
      break;
    }
    case 'grid': {
      const cols = Math.max(1, Math.round(v.cols));
      const rows = Math.ceil(n / cols);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const stepX = CARD * v.scale + v.gapX;
      const stepY = CARD * v.scale + v.gapY;
      x = (col - (cols - 1) / 2) * stepX;
      y = (row - (rows - 1) / 2) * stepY;
      rotation = v.rotate * DEG;
      break;
    }
  }

  return {
    x: x + v.offset.x,
    y: y + v.offset.y,
    scale: v.scale,
    rotation,
    alpha: 1,
    depth,
    rotateX: v.tiltX * DEG,
    rotateY: v.tiltY * DEG,
    perspective: v.perspective,
  };
}
