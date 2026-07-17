import { create } from 'zustand';

// Lightweight UI-only state (which nav section is active). Kept separate from
// the 2D scene store so 3D mode doesn't couple to motion/template state.
export interface UIState {
  nav: string;              // active IconRail section id
  tplCollapsed: boolean;    // left (templates/effects) column folded to a strip
  setNav: (nav: string) => void;
  toggleTplCollapsed: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  nav: 'library',
  tplCollapsed: false,
  setNav: (nav) => set({ nav }),
  toggleTplCollapsed: () => set((s) => ({ tplCollapsed: !s.tplCollapsed })),
}));
