import { create } from 'zustand';

// Web mode (SPIKE) — the user's pasted source plus which elements they marked.
// Kept separate from the 2D scene store and the 3D store for the same reason
// those are separate: mode state shouldn't couple across modes.

// Ships with the scenario the layout question is about: three fixed-size cards
// in a flex row, so marking them and applying a positional template shows
// immediately whether the template can share the layout or has to take it over.
//
// It's a bare JSX expression, Tailwind-classed — the shape a design tool
// pastes out, which is what this mode is for. The SVGs are the studio's own
// rail icons, written with React attribute names: a Figma export arrives with
// `stroke-width`/`stroke-linecap`, which render fine but make React log an
// "Invalid DOM property" error for every one of them.
const DEMO_SOURCE = `<div className="flex justify-start items-center gap-6">
  <div className="flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 h-[359px] w-[424px] gap-6 p-12 bg-white border border-[#ebebeb]">
    <div className="flex justify-between items-center self-stretch flex-grow-0 flex-shrink-0 relative overflow-hidden">
      <div className="flex justify-center items-center flex-grow-0 flex-shrink-0 relative overflow-hidden p-3 rounded bg-white border border-[#ebebeb]">
        <svg width={22} height={22} viewBox="0 0 20 20" fill="none" className="w-[22px] h-[22px]">
          <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="#6B7280" strokeWidth="1.5" />
          <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="#6B7280" strokeWidth="1.5" />
          <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="#6B7280" strokeWidth="1.5" />
          <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="#6B7280" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-left text-[#8e8e93]">01</p>
    </div>
    <div className="flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 relative gap-3">
      <p className="text-xl font-semibold text-left text-[#131415]">Lorem ipsum dolor</p>
      <p className="self-stretch w-[328px] text-base text-left text-[#131415]">
        “Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
        ut labore et dolore magna aliqua.”
      </p>
    </div>
  </div>
  <div className="flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 h-[359px] w-[424px] gap-6 p-12 bg-white border border-[#ebebeb]">
    <div className="flex justify-between items-center self-stretch flex-grow-0 flex-shrink-0 relative overflow-hidden">
      <div className="flex justify-center items-center flex-grow-0 flex-shrink-0 relative overflow-hidden p-3 rounded bg-white border border-[#e0e0e4]">
        <svg width={22} height={22} viewBox="0 0 20 20" fill="none" className="w-[22px] h-[22px]">
          <path d="M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5L10 2.5z" stroke="#6B7280" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3.7 6.4L10 10l6.3-3.6M10 10v7.4" stroke="#6B7280" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-left text-[#8e8e93]">02</p>
    </div>
    <div className="flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 relative gap-3">
      <p className="text-xl font-semibold text-left text-[#131415]">Vestibulum ante ipsum</p>
      <p className="self-stretch w-[328px] text-base text-left text-[#131415]">
        Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Nullam id dolor id nibh
        ultricies vehicula ut id elit. Cras mattis consectetur purus sit amet fermentum.
      </p>
    </div>
  </div>
  <div className="flex flex-col justify-start items-start flex-grow-0 flex-shrink-0 h-[359px] w-[424px] gap-6 p-12 bg-white border border-[#ebebeb]">
    <div className="flex justify-between items-center self-stretch flex-grow-0 flex-shrink-0 relative overflow-hidden">
      <div className="flex justify-center items-center flex-grow-0 flex-shrink-0 relative overflow-hidden p-3 rounded bg-white border border-[#e0e0e4]">
        <svg width={22} height={22} viewBox="0 0 20 20" fill="none" className="w-[22px] h-[22px]">
          <path d="M7.5 6.5L4 10l3.5 3.5M12.5 6.5L16 10l-3.5 3.5M11 4.5l-2 11" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-left text-[#8e8e93]">03</p>
    </div>
    <div className="flex flex-col justify-start items-start self-stretch flex-grow-0 flex-shrink-0 relative gap-3">
      <p className="text-xl font-semibold text-left text-[#131415]">Etiam porta sem</p>
      <p className="self-stretch w-[328px] text-base text-left text-[#131415]">
        Maecenas faucibus mollis interdum. Donec ullamcorper nulla non metus auctor fringilla. Duis
        mollis est non commodo luctus.
      </p>
      <p className="self-stretch w-[328px] text-base text-left text-[#131415]">
        Nulla vitae elit libero, a pharetra augue. Integer posuere erat a ante venenatis dapibus.
      </p>
    </div>
  </div>
</div>;`;

// Empty on purpose. The demo is Tailwind-only, and a starter stylesheet full
// of generic class names is a trap: an earlier demo defined `.grid` / `.card`,
// which silently overrode Tailwind's own `.grid` utility in anything pasted
// over it — collapsing the layout in a way that looked like a sizing bug.
const DEMO_CSS = '';

// How a template's pose meets the user's existing CSS layout — the open
// question this mode exists to answer, exposed as a switch so it can be felt
// rather than argued:
//
//  'own'      — the marked elements leave the flow (absolute, centred) and the
//               template positions them outright, exactly as it positions
//               sprites on the 2D canvas. Faithful to the template; destroys
//               whatever flex/grid the user wrote.
//  'decorate' — the elements stay where the user's CSS put them, and only the
//               template's *motion* is applied: its pose at this frame minus
//               its pose at frame 0. Layout survives; positional templates
//               lose their arrangement and keep only their movement.
export type LayoutMode = 'own' | 'decorate';

export interface Size { w: number; h: number }

export interface WebState {
  source: string;                 // JSX/TSX/HTML pasted by the user
  css: string;                    // plain CSS, scoped to the preview iframe
  tailwind: boolean;              // load the Tailwind JIT into the preview frame
  codeOpen: boolean;              // the fullscreen source editor
  layoutMode: LayoutMode;
  selected: string[];             // structural paths (see lib/domSelector)
  compileError: string | null;

  // The frame the motion happens in — the preview viewport and the exported
  // component's box, deliberately the same number. `null` means "whatever the
  // source measures", which is right until a template needs room the component
  // doesn't have: a card scaled past the component's own height would just be
  // clipped, since the frame crops rather than scrolls.
  canvas: Size | null;
  measured: Size | null;          // what the source rendered at; the 'auto' value

  // Pointer interaction. The curve is the scene's easing (see EasingPanel) —
  // the app already has a stack of them, and a hover ramp is not a different
  // kind of motion, so it doesn't get a different kind of control.
  hoverPause: boolean;
  hoverMs: number;                // time to reach a standstill, and to return

  setSource: (source: string) => void;
  setCss: (css: string) => void;
  setTailwind: (on: boolean) => void;
  setCodeOpen: (open: boolean) => void;
  setLayoutMode: (m: LayoutMode) => void;
  setCanvas: (c: Size | null) => void;
  setMeasured: (s: Size | null) => void;
  setHoverPause: (on: boolean) => void;
  setHoverMs: (ms: number) => void;
  toggleSelected: (sel: string) => void;
  clearSelected: () => void;
  setCompileError: (e: string | null) => void;
}

const clampDim = (n: number) => Math.min(8192, Math.max(16, Math.round(n) || 16));

export const useWebStore = create<WebState>((set) => ({
  source: DEMO_SOURCE,
  css: DEMO_CSS,
  // On by default: design tools paste Tailwind, and without the JIT every
  // utility class is a silent no-op — the component collapses into stacked
  // blocks and looks like a sizing bug rather than a missing stylesheet.
  tailwind: true,
  // Opens on first entry: there is nothing to do in web mode until source
  // exists, and the editor is the only thing that matters at that moment.
  codeOpen: true,
  layoutMode: 'own',
  selected: [],
  compileError: null,
  canvas: null,
  measured: null,
  hoverPause: true,
  hoverMs: 450,

  // Editing the source invalidates every path — nth-child steps are only
  // meaningful against the tree they were captured from. A new component also
  // gets a fresh canvas: the old one's box means nothing to it.
  setSource: (source) => set({ source, selected: [], canvas: null, measured: null }),
  setCss: (css) => set({ css }),
  setTailwind: (tailwind) => set({ tailwind }),
  setCodeOpen: (codeOpen) => set({ codeOpen }),
  setLayoutMode: (layoutMode) => set({ layoutMode }),
  setCanvas: (c) => set({ canvas: c && { w: clampDim(c.w), h: clampDim(c.h) } }),
  setMeasured: (measured) => set({ measured }),
  setHoverPause: (hoverPause) => set({ hoverPause }),
  setHoverMs: (hoverMs) => set({ hoverMs: Math.min(3000, Math.max(0, Math.round(hoverMs))) }),
  toggleSelected: (sel) =>
    set((s) => ({
      selected: s.selected.includes(sel)
        ? s.selected.filter((x) => x !== sel)
        : [...s.selected, sel],
    })),
  clearSelected: () => set({ selected: [] }),
  setCompileError: (compileError) => set({ compileError }),
}));
