// ============================================================
//  BOARD MODE — COMPOSE STACK + CSS MAPPING
//  final = board(i) ⊕ groupMotion(frame)
//
//  Layer 1 is the static board (lib/boardPose): where a card rests and how it
//  is tilted. Layer 2 is the animation's *motion only* — its pose at `frame`
//  minus its pose at frame 0, the same delta the Web spike's 'decorate' takes.
//  Adding the delta (never replacing the board) is what keeps the group
//  animation from erasing the arrangement, and leaves room for a per-card
//  interaction layer to be added on top without either lower layer rewritten.
//
//  With `motionOn` false there is no template term: the board is the whole
//  pose — the static version.
// ============================================================

import type { Template, TransformCtx } from './types';
import { boardPose, type BoardTransform, type BoardValues, type BoardPerCard } from './boardPose';

const DEG = 180 / Math.PI;

// One motion layer to stack on top of the board rest: a template sampled at a
// per-card timing, weighted, its translation optionally mirrored. Every scene is
// one of these — the final pose is board ⊕ Σ(layers).
export interface MotionLayer {
  template: Template;
  values: Record<string, any>;
  frame: number;
  motionIndex: number;
  motionCount: number;
  weight: number;      // 0..1 gate
  motionSign: number;  // ±1, mirrors the layer's translation
}

// Compose the board rest with any number of motion layers. Each layer adds its
// motion-only delta (its pose at `frame` minus its rest at 0), so layers stack
// without erasing the board or each other: translations sum, scales multiply,
// rotations/skews sum. `hideFade` pins alpha (card-scope hover keeps cards
// solid). This is the general form of composedPose.
export function composedPoseLayers(
  board: BoardValues,
  perCard: BoardPerCard | undefined,
  index: number,
  count: number,
  ctx: TransformCtx,
  motionOn: boolean,
  layers: MotionLayer[],
  hideFade: boolean,
): BoardTransform {
  const base = boardPose(index, count, board, perCard);
  if (!motionOn || layers.length === 0) return base;

  let motionX = 0, motionY = 0;
  let scale = base.scale, scaleX = base.scaleX ?? 1, scaleY = base.scaleY ?? 1;
  let rotation = base.rotation, skewX = base.skewX ?? 0, skewY = base.skewY ?? 0;
  let alpha = base.alpha;

  for (const L of layers) {
    const w = L.weight >= 1 ? 1 : L.weight <= 0 ? 0 : L.weight;
    if (w <= 0) continue;
    const rest = L.template.transform(0, L.motionIndex, L.motionCount, L.values, ctx);
    const cur = L.template.transform(L.frame, L.motionIndex, L.motionCount, L.values, ctx);
    motionX += (cur.x - rest.x) * w * L.motionSign;
    motionY += (cur.y - rest.y) * w * L.motionSign;
    // scale/skew are multiplicative/additive about each template's own rest pose
    // (may not be identity), so normalize against it before composing.
    scale *= 1 + ((rest.scale !== 0 ? cur.scale / rest.scale : 1) - 1) * w;
    scaleX *= 1 + ((cur.scaleX ?? 1) / (rest.scaleX ?? 1) - 1) * w;
    scaleY *= 1 + ((cur.scaleY ?? 1) / (rest.scaleY ?? 1) - 1) * w;
    rotation += (cur.rotation - rest.rotation) * w;
    skewX += ((cur.skewX ?? 0) - (rest.skewX ?? 0)) * w;
    skewY += ((cur.skewY ?? 0) - (rest.skewY ?? 0)) * w;
    if (!hideFade) alpha *= 1 + (cur.alpha - 1) * w; // else keep cards solid
  }

  return {
    x: base.x, y: base.y,
    motionX, motionY,
    scale, scaleX, scaleY,
    rotation, skewX, skewY,
    alpha,
    depth: base.depth,
    rotateX: base.rotateX,
    rotateY: base.rotateY,
    perspective: base.perspective,
  };
}

export function composedPose(
  template: Template,
  board: BoardValues,
  perCard: BoardPerCard | undefined,
  motionOn: boolean,
  frame: number,
  index: number,
  count: number,
  values: Record<string, any>,
  ctx: TransformCtx,
  // Per-card motion weight 0..1 (the mouse-on-point hover layer). 1 = full
  // animation, 0 = the static board rest with no motion. Neighbours of the
  // hovered card get a fractional weight so the effect spills to nearby cards.
  weight = 1,
  // The (index, count) the TEMPLATE sees, decoupled from the board slot. Board
  // position always comes from the real `index`; but the hover layer feeds a
  // remapped pair so the card under the pointer becomes the front of a small
  // local stack (motionIndex 0) that plays on its own clock — the animation
  // triggers where the mouse is, not where the shared timeline happens to be.
  motionIndex = index,
  motionCount = count,
  // Card-scope hover kills the template's fades: cards move but never fade in or
  // out, so the deck opens/holds solid instead of dissolving mid-board.
  hideFade = false,
  // Flips the animation's translation so a reveal pushes cards AWAY from the
  // pointer (open the deck) instead of toward it. −1 = away, +1 = as authored.
  motionSign = 1,
): BoardTransform {
  const base = boardPose(index, count, board, perCard);
  if (!motionOn || weight <= 0) return base;

  const rest = template.transform(0, motionIndex, motionCount, values, ctx);
  const cur = template.transform(frame, motionIndex, motionCount, values, ctx);

  // Full-motion terms about the board rest, then scaled by `weight` so the card
  // eases from its static pose (w=0) to the full animation (w=1). lerp(a,b,w).
  const w = weight >= 1 ? 1 : weight;
  const lerp = (a: number, b: number) => a + (b - a) * w;
  return {
    // The board arrangement fixes the on-screen position; the animation's
    // translation is handed off as motionX/motionY so it can be applied inside
    // the tilted plane (see boardTransformCss), not flat across the screen.
    x: base.x,
    y: base.y,
    motionX: (cur.x - rest.x) * w * motionSign,
    motionY: (cur.y - rest.y) * w * motionSign,
    // scale/skew are multiplicative/additive about the template's own rest pose
    // (which may not be identity), so normalize the motion against it before
    // composing onto the board's scale.
    scale: lerp(base.scale, base.scale * (rest.scale !== 0 ? cur.scale / rest.scale : 1)),
    scaleX: lerp(base.scaleX ?? 1, (base.scaleX ?? 1) * ((cur.scaleX ?? 1) / (rest.scaleX ?? 1))),
    scaleY: lerp(base.scaleY ?? 1, (base.scaleY ?? 1) * ((cur.scaleY ?? 1) / (rest.scaleY ?? 1))),
    rotation: lerp(base.rotation, base.rotation + (cur.rotation - rest.rotation)),
    skewX: lerp(base.skewX ?? 0, (base.skewX ?? 0) + ((cur.skewX ?? 0) - (rest.skewX ?? 0))),
    skewY: lerp(base.skewY ?? 0, (base.skewY ?? 0) + ((cur.skewY ?? 0) - (rest.skewY ?? 0))),
    // Alpha is absolute: a template that fades a layer means it to be faded —
    // unless the hover layer asked to keep every card solid (hideFade).
    alpha: hideFade ? base.alpha : lerp(base.alpha, cur.alpha),
    depth: base.depth,
    rotateX: base.rotateX,
    rotateY: base.rotateY,
    perspective: base.perspective,
  };
}

// The CSS `transform` for a board pose. Cards are pinned at the stage centre
// (left/top 50%), so the anchor pull-back leads, then the true-3D tilt.
export function boardTransformCss(t: BoardTransform): string {
  const parts: string[] = [];
  // perspective() must lead for the 3D tilt below it to be seen in depth.
  if (t.perspective) parts.push(`perspective(${t.perspective.toFixed(0)}px)`);
  parts.push(`translate(-50%, -50%)`);
  parts.push(`translate(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px)`);
  if (t.rotateX) parts.push(`rotateX(${(t.rotateX * DEG).toFixed(3)}deg)`);
  if (t.rotateY) parts.push(`rotateY(${(t.rotateY * DEG).toFixed(3)}deg)`);
  // The animation's slide runs here — after the 3D tilt — so it moves along the
  // plane the cards were tilted onto, not flat across the screen.
  if (t.motionX || t.motionY) parts.push(`translate(${(t.motionX ?? 0).toFixed(2)}px, ${(t.motionY ?? 0).toFixed(2)}px)`);
  parts.push(`rotate(${(t.rotation * DEG).toFixed(3)}deg)`);
  parts.push(`scale(${(t.scale * (t.scaleX ?? 1)).toFixed(4)}, ${(t.scale * (t.scaleY ?? 1)).toFixed(4)})`);
  const sx = t.skewX ?? 0, sy = t.skewY ?? 0;
  if (sx || sy) parts.push(`skew(${(sx * DEG).toFixed(3)}deg, ${(sy * DEG).toFixed(3)}deg)`);
  return parts.join(' ');
}

// Apply a pose to a card element. Cards are absolutely centred on the stage.
export function applyCardPose(el: HTMLElement, t: BoardTransform, i: number) {
  el.style.position = 'absolute';
  el.style.left = '50%';
  el.style.top = '50%';
  el.style.margin = '0';
  el.style.transform = boardTransformCss(t);
  el.style.opacity = String(t.alpha);
  el.style.zIndex = String(Math.round(t.depth * 1000 + i));
}
