import { create } from 'zustand';

// Lightweight UI-only state (which nav section is active). Kept separate from
// the 2D scene store so 3D mode doesn't couple to motion/template state.
export interface UIState {
  nav: string;              // active IconRail section id
  setNav: (nav: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  nav: 'library',
  setNav: (nav) => set({ nav }),
}));
