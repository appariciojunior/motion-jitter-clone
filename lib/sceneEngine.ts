// ============================================================
//  SCENE ENGINE — PURE INTERACTION LAYERS
//  Interaction logic lives here, fully decoupled from React and the DOM: given
//  the reduced pointer input and a config, an interaction advances its own
//  per-card state and returns what each card should render. BoardStage is only a
//  driver — it feeds input in and applies the output.
//
//  This is the seam that lets scenes COMPOSE: each scene is one interaction
//  layer with its own isolated state, and the final pose is the sum of every
//  layer's contribution (see boardCompose's "add deltas, never replace" rule).
//  The first layer is the "book collection" hover below.
// ============================================================

import { loopCycles } from './motion';

// The pointer reduced to what every layer needs: which card is focused (−1 =
// none) and whether the pointer is still anywhere on the board.
export interface SceneInput {
  focus: number;
  onBoard: boolean;
  dt: number; // seconds since the last frame
}

// Config for the collection layer, re-read each frame from the stores.
export interface CollectionCfg {
  count: number;
  radius: number;
  side: 'left' | 'right' | 'both';
  rampMs: number;   // time a card takes to slide fully open / closed
  speed: number;    // template steps/sec (sets one step's length in frames)
  duration: number; // clip seconds
  fps: number;
}

// What a single card should render this frame. `slot`/`weight` are the follower
// slot and intensity captured when the card first opened, so the rich per-card
// timing survives the focus moving on.
export interface CardMotion {
  frame: number;  // this card's own open progress, in frames
  slot: number;   // template motionIndex (follower slot, 1..R)
  weight: number; // template motion intensity (0..1)
}

export interface CollectionFrame {
  cards: CardMotion[];
  motionCount: number; // template motionCount (the local stack size)
  motionSign: number;  // push the opened side away from the focus
}

// The "book collection" hover, as a stateful-but-isolated pure layer. Focus F is
// the card under the pointer, held while the pointer is between books so opened
// cards STAY; everything on the reveal side of F opens; moving F right opens
// more, moving F left un-parks, leaving the board collapses it all home.
export function createCollectionScene() {
  let activeIdx = -1;     // focus F, held through the exit
  let returning = false;  // pointer left the board → collapse home
  const openF: number[] = []; // per-card open progress (frames)
  const slot: number[] = [];  // per-card captured follower slot (0 = home/unset)
  const wgt: number[] = [];   // per-card captured intensity
  const cards: CardMotion[] = [];

  function reset() {
    activeIdx = -1;
    returning = false;
    openF.length = 0;
    slot.length = 0;
    wgt.length = 0;
    cards.length = 0;
  }

  function update(input: SceneInput, cfg: CollectionCfg): CollectionFrame {
    const { focus, onBoard, dt } = input;
    const { count: n, radius: R, side, rampMs, speed, duration, fps } = cfg;

    const total = Math.max(1, Math.round(duration * fps));
    // The opened cards form a local stack of up to R+1 slots, so a captured slot
    // (1..R) maps to a real slot and the template's staggered per-slot timing
    // survives. capFrame = one full step (one slot advance) in frames.
    const mCount = Math.max(2, R + 1);
    const cyc = Math.abs(loopCycles(speed, duration, mCount)) || 1;
    const capFrame = Math.max(1, Math.ceil(total / cyc) - 1);

    // Focus + return resolution. The focus is held when the pointer is between
    // books (off a card but still on the board) so the collection persists.
    if (focus >= 0) { activeIdx = focus; returning = false; }
    else if (!onBoard) { returning = true; }
    const F = activeIdx;

    // Frames slid per tick — rampMs sets how long a card takes to open / close.
    const df = rampMs > 0 ? capFrame * (dt * 1000 / rampMs) : capFrame;

    // Current opened extent (armed = slot captured). New cards may only open on
    // the LEADING edge — never deeper than the current extent — so moving the
    // focus back the other way un-parks cards without the R-window re-opening a
    // fresh deeper one on the far side.
    let lo = Infinity, hi = -1;
    for (let i = 0; i < n; i++) if ((slot[i] ?? 0) > 0) { if (i < lo) lo = i; if (i > hi) hi = i; }
    const hasOpen = hi >= 0;

    for (let i = 0; i < n; i++) {
      const of = openF[i] ?? 0;
      const armed = (slot[i] ?? 0) > 0; // already in the open set
      let tgt = 0;
      if (!returning && F >= 0) {
        // Signed distance on the reveal side (>0 = this card opens away from F).
        const dist = side === 'right' ? i - F : side === 'left' ? F - i : Math.abs(i - F);
        const onOpenSide = dist >= 1;
        if (armed) {
          // Stay open while still on the open side; close when the focus crosses
          // back past it (un-park).
          if (onOpenSide) tgt = capFrame;
        } else if (onOpenSide && dist <= R) {
          // New open: only on the leading edge. For one-sided reveals, refuse to
          // open a card deeper than the current extent (that's the "moving back"
          // case — it should only un-park, never open a fresh deeper card).
          let allow = true;
          if (hasOpen && side === 'left') allow = i >= lo;
          else if (hasOpen && side === 'right') allow = i <= hi;
          if (allow) {
            tgt = capFrame;
            // Capture the slot + intensity once, then freeze so the card keeps
            // its timing when the focus moves on.
            const s = Math.max(1, Math.min(R, dist));
            slot[i] = s;
            wgt[i] = 1 - (s - 1) / (R + 1); // adjacent hardest, fading over R
          }
        }
      }
      const nf = of < tgt ? Math.min(tgt, of + df) : of > tgt ? Math.max(tgt, of - df) : of;
      openF[i] = nf <= 0.001 ? 0 : nf;
      if (openF[i] === 0) { slot[i] = 0; wgt[i] = 0; } // fully home → forget capture
      cards[i] = {
        frame: openF[i],
        slot: Math.max(1, slot[i] ?? 1),
        weight: openF[i] > 0.01 ? (wgt[i] ?? 0) : 0,
      };
    }
    cards.length = n;

    // Once the collection is fully home, release the focus so re-entering a card
    // starts a clean open.
    if (returning) {
      let any = false;
      for (let i = 0; i < n; i++) if ((openF[i] ?? 0) > 0.5) { any = true; break; }
      if (!any) { activeIdx = -1; returning = false; }
    }

    return { cards, motionCount: mCount, motionSign: side === 'right' ? -1 : 1 };
  }

  return { update, reset };
}

export type CollectionScene = ReturnType<typeof createCollectionScene>;

// ------------------------------------------------------------
//  SCENE 2 — LIFT (keyed to the focused card)
// ------------------------------------------------------------

export interface LiftCfg {
  count: number;
  rampMs: number;
  speed: number;
  duration: number;
  fps: number;
}

// Lifts the card under the pointer (and lowers it as the focus moves on or
// leaves), so a wave follows the mouse. Fully independent of the collection
// layer — same input, its own state — and rendered through a Stack-01 template
// by the driver so it keeps that animation's eased detail.
export function createLiftScene() {
  const liftF: number[] = []; // per-card lift progress in frames
  const cards: CardMotion[] = [];

  function reset() { liftF.length = 0; cards.length = 0; }

  function update(input: SceneInput, cfg: LiftCfg): CollectionFrame {
    const { focus, onBoard, dt } = input;
    const { count: n, rampMs, speed, duration, fps } = cfg;

    const total = Math.max(1, Math.round(duration * fps));
    const mCount = 2; // a single card doing one follower-slot lift
    const cyc = Math.abs(loopCycles(speed, duration, mCount)) || 1;
    const capFrame = Math.max(1, Math.ceil(total / cyc) - 1);
    const df = rampMs > 0 ? capFrame * (dt * 1000 / rampMs) : capFrame;

    for (let i = 0; i < n; i++) {
      const tgt = onBoard && focus >= 0 && i === focus ? capFrame : 0;
      const of = liftF[i] ?? 0;
      const nf = of < tgt ? Math.min(tgt, of + df) : of > tgt ? Math.max(tgt, of - df) : of;
      liftF[i] = nf <= 0.001 ? 0 : nf;
      cards[i] = { frame: liftF[i], slot: 1, weight: liftF[i] > 0.01 ? 1 : 0 };
    }
    cards.length = n;
    return { cards, motionCount: mCount, motionSign: 1 };
  }

  return { update, reset };
}

export type LiftScene = ReturnType<typeof createLiftScene>;
