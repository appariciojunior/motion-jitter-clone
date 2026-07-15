import { create } from 'zustand';
import { defaultsFor } from '@/templates';

// ---------- canvas dimension helpers ----------
export const ASPECTS: Record<string, [number, number]> = {
  '3:4': [3, 4],
  '9:16': [9, 16],
  '1:1': [1, 1],
  '4:3': [4, 3],
  '16:9': [16, 9],
};

const BASE = 1080; // longest edge in export pixels
export function dimsFor(aspect: string): { width: number; height: number } {
  const [aw, ah] = ASPECTS[aspect] ?? ASPECTS['3:4'];
  if (aw >= ah) return { width: BASE, height: Math.round((BASE * ah) / aw) };
  return { width: Math.round((BASE * aw) / ah), height: BASE };
}

// ---------- store types ----------
export interface AssetItem {
  id: string;
  name: string;
  url: string;
  visible: boolean;
}

export interface ActiveEffect {
  instanceId: string;
  effectId: string;
  enabled: boolean;
  values: Record<string, any>;
}

export interface BackgroundSettings {
  color: string;
  gradient: boolean;
  color2: string;
}

export interface LogoSettings {
  url: string | null;
  position: 'tl' | 'tr' | 'bl' | 'br';
  size: number; // px
}

export interface TextSettings {
  content: string;
  position: 'top' | 'center' | 'bottom';
  color: string;
  size: number;
}

export interface SceneState {
  // motion template
  activeTemplateId: string;
  values: Record<string, any>;

  // clock
  frame: number;
  fps: number;
  duration: number; // seconds
  playing: boolean;

  // canvas
  aspect: string;
  width: number;
  height: number;
  safeArea: boolean;
  background: BackgroundSettings;
  logo: LogoSettings;
  text: TextSettings;
  audioUrl: string | null;

  // assets → layer slots
  assets: AssetItem[];

  // effects (SEAM 2)
  effects: ActiveEffect[];

  // ---- actions ----
  setValue: (key: string, val: any) => void;
  setActiveTemplate: (id: string) => void;
  setFrame: (frame: number) => void;
  setPlaying: (p: boolean) => void;
  setFps: (fps: number) => void;
  setAspect: (aspect: string) => void;
  setDuration: (d: number) => void;
  toggleSafeArea: () => void;
  setBackground: (patch: Partial<BackgroundSettings>) => void;
  setLogo: (patch: Partial<LogoSettings>) => void;
  setText: (patch: Partial<TextSettings>) => void;
  setAudioUrl: (url: string | null) => void;

  addAssets: (items: Omit<AssetItem, 'id' | 'visible'>[]) => void;
  removeAsset: (id: string) => void;
  toggleAsset: (id: string) => void;
  reorderAssets: (from: number, to: number) => void;
  clearAssets: () => void;

  addEffect: (effectId: string, values: Record<string, any>) => void;
  removeEffect: (instanceId: string) => void;
  toggleEffect: (instanceId: string) => void;
  reorderEffects: (from: number, to: number) => void;
  setEffectValue: (instanceId: string, key: string, val: any) => void;

  get totalFrames(): number;
}

// simple id generator (no Date.now/Math.random constraints in app runtime, but keep it counter-based for determinism)
let _idc = 0;
const nid = (prefix: string) => `${prefix}_${++_idc}`;

const INITIAL_TEMPLATE = 'carousel';
const initDims = dimsFor('3:4');

export const useSceneStore = create<SceneState>((set, get) => ({
  activeTemplateId: INITIAL_TEMPLATE,
  values: defaultsFor(INITIAL_TEMPLATE),

  frame: 0,
  fps: 30,
  duration: 8,
  playing: true, // autoplay loop by default

  aspect: '3:4',
  width: initDims.width,
  height: initDims.height,
  safeArea: false,
  background: { color: '#0d0d0d', gradient: false, color2: '#1f1f1f' },
  logo: { url: null, position: 'br', size: 96 },
  text: { content: '', position: 'bottom', color: '#ffffff', size: 48 },
  audioUrl: null,

  assets: [],
  effects: [],

  setValue: (key, val) =>
    set((s) => ({ values: { ...s.values, [key]: val } })),

  // full reset on template switch: wipe bag, refill from declared defaults
  setActiveTemplate: (id) =>
    set(() => ({ activeTemplateId: id, values: defaultsFor(id), frame: 0 })),

  setFrame: (frame) => set(() => ({ frame })),
  setPlaying: (p) => set(() => ({ playing: p })),

  setFps: (fps) => set(() => ({ fps })),
  setAspect: (aspect) =>
    set(() => ({ aspect, ...dimsFor(aspect) })),
  setDuration: (d) => set(() => ({ duration: d })),
  toggleSafeArea: () => set((s) => ({ safeArea: !s.safeArea })),
  setBackground: (patch) => set((s) => ({ background: { ...s.background, ...patch } })),
  setLogo: (patch) => set((s) => ({ logo: { ...s.logo, ...patch } })),
  setText: (patch) => set((s) => ({ text: { ...s.text, ...patch } })),
  setAudioUrl: (url) => set(() => ({ audioUrl: url })),

  addAssets: (items) =>
    set((s) => ({
      assets: [
        ...s.assets,
        ...items.map((it) => ({ ...it, id: nid('asset'), visible: true })),
      ],
    })),
  removeAsset: (id) =>
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),
  toggleAsset: (id) =>
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, visible: !a.visible } : a)),
    })),
  reorderAssets: (from, to) =>
    set((s) => {
      const next = s.assets.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { assets: next };
    }),
  clearAssets: () => set(() => ({ assets: [] })),

  addEffect: (effectId, values) =>
    set((s) => ({
      effects: [
        ...s.effects,
        { instanceId: nid('fx'), effectId, enabled: true, values: { ...values } },
      ],
    })),
  removeEffect: (instanceId) =>
    set((s) => ({ effects: s.effects.filter((e) => e.instanceId !== instanceId) })),
  toggleEffect: (instanceId) =>
    set((s) => ({
      effects: s.effects.map((e) =>
        e.instanceId === instanceId ? { ...e, enabled: !e.enabled } : e
      ),
    })),
  reorderEffects: (from, to) =>
    set((s) => {
      const next = s.effects.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { effects: next };
    }),
  setEffectValue: (instanceId, key, val) =>
    set((s) => ({
      effects: s.effects.map((e) =>
        e.instanceId === instanceId
          ? { ...e, values: { ...e.values, [key]: val } }
          : e
      ),
    })),

  get totalFrames() {
    return Math.max(1, Math.round(get().duration * get().fps));
  },
}));
