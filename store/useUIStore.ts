import { create } from 'zustand';

// Lightweight UI-only state (which nav section is active). Kept separate from
// the 2D scene store so 3D mode doesn't couple to motion/template state.
export interface UIState {
  nav: string;              // active IconRail section id
  theme: 'light' | 'dark';
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  setNav: (nav: string) => void;
  toggleTheme: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  hydratePreferences: () => void;
}

const PREFS_KEY = 'motion-ui-preferences';

function savePreferences(prefs: Pick<UIState, 'theme' | 'leftCollapsed' | 'rightCollapsed'>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFS_KEY, JSON.stringify({
    theme: prefs.theme,
    leftCollapsed: prefs.leftCollapsed,
    rightCollapsed: prefs.rightCollapsed,
  }));
  document.documentElement.dataset.theme = prefs.theme;
}

export const useUIStore = create<UIState>((set) => ({
  nav: 'library',
  theme: 'light',
  leftCollapsed: false,
  rightCollapsed: false,
  setNav: (nav) => set({ nav }),
  toggleTheme: () => set((state) => {
    const next = { ...state, theme: state.theme === 'dark' ? 'light' as const : 'dark' as const };
    savePreferences(next);
    return { theme: next.theme };
  }),
  toggleLeftPanel: () => set((state) => {
    const next = { ...state, leftCollapsed: !state.leftCollapsed };
    savePreferences(next);
    return { leftCollapsed: next.leftCollapsed };
  }),
  toggleRightPanel: () => set((state) => {
    const next = { ...state, rightCollapsed: !state.rightCollapsed };
    savePreferences(next);
    return { rightCollapsed: next.rightCollapsed };
  }),
  hydratePreferences: () => set((state) => {
    if (typeof window === 'undefined') return {};
    let saved: Partial<Pick<UIState, 'theme' | 'leftCollapsed' | 'rightCollapsed'>> = {};
    try { saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}'); } catch { /* use defaults */ }
    const theme = saved.theme === 'dark' || saved.theme === 'light'
      ? saved.theme
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const next = {
      theme,
      leftCollapsed: saved.leftCollapsed ?? state.leftCollapsed,
      rightCollapsed: saved.rightCollapsed ?? state.rightCollapsed,
    };
    savePreferences({ ...state, ...next });
    return next;
  }),
}));
