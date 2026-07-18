import { create } from 'zustand';
import { BOARD_DEFAULTS, type BoardValues, type BoardPerCard } from '@/lib/boardPose';

// Board mode — a self-contained playground: N static cards arranged with the
// slider vocabulary, with a chosen animation optionally layered on top. Kept
// apart from the 2D/3D/web stores for the same reason those are separate: mode
// state shouldn't couple across modes. The chosen animation + timing come from
// the shared scene store (the template list drives it); everything the board
// itself owns lives here.
export interface BoardState {
  count: number;                 // how many cards on the board
  board: BoardValues;            // the group arrangement (persists across template switches)
  perCard: BoardPerCard;         // per-slot overrides (the next stage populates this)
  motionOn: boolean;             // run the selected animation on top of the board

  // Mouse trigger: when on, the animation only runs while the pointer is over
  // the board, easing up on enter and back to a standstill on leave.
  hoverPlay: boolean;
  hoverMs: number;               // ramp time to full speed / back to a stop
  // Scope of the hover trigger:
  //   'board' — pointer anywhere over the stage plays the whole animation.
  //   'card'  — pointer over ONE card plays that card + its neighbours only,
  //             weighted by distance (mouse-on-point). See hoverRadius.
  hoverScope: 'board' | 'card';
  hoverRadius: number;           // card-scope: how many neighbours spill to
  // card-scope reveal direction: 'both' = symmetric bump around the pointer;
  // 'left'/'right' = one-sided — the hovered card stays put and the cards on
  // that side pull away (adjacent strongest, fading out over `hoverRadius`), so
  // the deck opens to reveal the card under the pointer.
  hoverSide: 'both' | 'left' | 'right';
  // Scene 2: layer a Stack-01 "up" lift on top of the opened cards, sharing the
  // collection's per-card timing so it cascades with the same richness.
  liftOn: boolean;

  // Artboard the cards live on — a fixed logical frame (default 1440×720) that
  // scales to fit the stage. Gives the scene a real composition boundary for
  // export, instead of filling the whole panel.
  frameW: number;
  frameH: number;

  setCount: (n: number) => void;
  setBoardValue: (key: keyof BoardValues, val: any) => void;
  resetBoard: () => void;
  setMotionOn: (on: boolean) => void;
  setHoverPlay: (on: boolean) => void;
  setHoverMs: (ms: number) => void;
  setHoverScope: (scope: 'board' | 'card') => void;
  setHoverRadius: (r: number) => void;
  setHoverSide: (s: 'both' | 'left' | 'right') => void;
  setLiftOn: (on: boolean) => void;
  setFrameSize: (w: number, h: number) => void;
}

const freshBoard = (): BoardValues => ({ ...BOARD_DEFAULTS, offset: { ...BOARD_DEFAULTS.offset } });

export const useBoardStore = create<BoardState>((set) => ({
  count: 3,
  board: freshBoard(),
  perCard: {},
  motionOn: false,
  hoverPlay: false,
  hoverMs: 350,
  hoverScope: 'board',
  hoverRadius: 1,
  hoverSide: 'both',
  liftOn: true,
  frameW: 1440,
  frameH: 720,

  setCount: (n) => set({ count: Math.min(200, Math.max(1, Math.round(n) || 1)) }),
  setBoardValue: (key, val) => set((s) => ({ board: { ...s.board, [key]: val } })),
  resetBoard: () => set({ board: freshBoard(), perCard: {} }),
  setMotionOn: (motionOn) => set({ motionOn }),
  setHoverPlay: (hoverPlay) => set({ hoverPlay }),
  setHoverMs: (hoverMs) => set({ hoverMs: Math.min(2000, Math.max(0, Math.round(hoverMs))) }),
  setHoverScope: (hoverScope) => set({ hoverScope }),
  setHoverRadius: (hoverRadius) => set({ hoverRadius: Math.min(20, Math.max(0, Math.round(hoverRadius))) }),
  setHoverSide: (hoverSide) => set({ hoverSide }),
  setLiftOn: (liftOn) => set({ liftOn }),
  setFrameSize: (w, h) => set({
    frameW: Math.min(8192, Math.max(16, Math.round(w) || 1440)),
    frameH: Math.min(8192, Math.max(16, Math.round(h) || 720)),
  }),
}));
