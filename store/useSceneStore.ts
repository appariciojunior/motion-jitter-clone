import { create } from 'zustand';
import { defaultsFor, easingFor } from '@/templates';
import type { EasingSpec } from '@/lib/easing';
import type { CropFocus } from '@/lib/crop';
import { DEMO_ASSETS } from '@/lib/demoAssets';
import { idbPut, idbGet, idbDelete } from '@/lib/assetDb';

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
  kind?: 'image' | 'video'; // media type; undefined = image (backward compatible)
  origin?: 'remote' | 'upload'; // 'upload' bytes live in IndexedDB and restore on reload
  crop?: CropFocus; // cover-fit focal point 0..1 per axis; undefined = centre
}

// Upload actions accept the source Blob so its bytes can be stashed in
// IndexedDB for persistence; it is never kept in the store itself.
type AssetInput = Omit<AssetItem, 'id' | 'visible'> & { blob?: Blob };

export interface ActiveEffect {
  instanceId: string;
  effectId: string;
  enabled: boolean;
  values: Record<string, any>;
}

export interface BackgroundSettings {
  source: 'color' | 'image' | 'card'; // solid/gradient · uploaded image · reflected from the featured card
  color: string;
  gradient: boolean;
  color2: string;
  imageUrl: string | null;            // for source: 'image'
  blur: number;                       // px blur for image/card backgrounds
}

export interface LogoSettings {
  url: string | null;
  position: 'tl' | 'tr' | 'bl' | 'br';
  size: number; // px
}

// A named snapshot of a template's tweaked values + easing ("Save as custom").
export interface CustomPreset {
  id: string;
  name: string;
  templateId: string;
  values: Record<string, any>;
  easing: EasingSpec;
}

const PRESETS_KEY = 'motion-custom-presets';
function persistPresets(list: CustomPreset[]) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); } catch { /* storage full/blocked */ }
}

export interface SceneState {
  // motion template
  activeTemplateId: string;
  values: Record<string, any>;
  easing: EasingSpec;   // scene easing curve (seeded from the template default)

  // clock
  frame: number;
  fps: number;
  duration: number; // seconds
  playing: boolean;

  // canvas
  aspect: string;       // key of ASPECTS, or 'custom'
  width: number;        // logical/preview px (longest edge normalized to BASE)
  height: number;
  customW: number;      // exact export px when aspect === 'custom'
  customH: number;
  safeArea: boolean;
  background: BackgroundSettings;
  logo: LogoSettings;
  audioUrl: string | null;

  // assets → layer slots
  assets: AssetItem[];
  cardShape: string; // scene-level crop aspect for cards: 'auto' or a CARD_SHAPES key
  // when a card video is shorter than the clip: restart it ('loop') or freeze
  // on its final frame ('hold') — applies to preview and export alike
  videoEnd: 'loop' | 'hold';

  // effects (SEAM 2)
  effects: ActiveEffect[];

  // custom presets (saved template snapshots)
  customPresets: CustomPreset[];

  // ---- actions ----
  setValue: (key: string, val: any) => void;
  setActiveTemplate: (id: string) => void;
  setEasing: (easing: EasingSpec) => void;
  resetValues: () => void;
  setFrame: (frame: number) => void;
  setPlaying: (p: boolean) => void;
  setFps: (fps: number) => void;
  setAspect: (aspect: string) => void;
  setCustomDims: (w: number, h: number) => void;
  setDuration: (d: number) => void;
  toggleSafeArea: () => void;
  setBackground: (patch: Partial<BackgroundSettings>) => void;
  setLogo: (patch: Partial<LogoSettings>) => void;
  setAudioUrl: (url: string | null) => void;

  addAssets: (items: AssetInput[]) => void;
  replaceAssetAt: (index: number, item: AssetInput) => void;
  removeAsset: (id: string) => void;
  toggleAsset: (id: string) => void;
  reorderAssets: (from: number, to: number) => void;
  clearAssets: () => void;
  setAssetCrop: (id: string, crop: CropFocus) => void;
  setAllAssetCrops: (crop: CropFocus) => void;
  setCardShape: (shape: string) => void;
  setVideoEnd: (mode: 'loop' | 'hold') => void;

  // persistence (see lib/scenePersist)
  hydrate: (partial: Partial<SceneState>) => void;   // apply a loaded scene
  rehydrateUploads: () => Promise<void>;             // rebuild upload urls from IndexedDB

  loadCustomPresets: () => void;
  saveCustomPreset: (name: string) => void;
  applyCustomPreset: (id: string) => void;
  deleteCustomPreset: (id: string) => void;

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

// After restoring persisted assets, advance the counter past any restored ids so
// freshly-generated ids can never collide with rehydrated ones.
function seedIdCounter(assets: { id: string }[]) {
  for (const a of assets) {
    const m = /_(\d+)$/.exec(a.id);
    if (m) _idc = Math.max(_idc, Number(m[1]));
  }
}

const INITIAL_TEMPLATE = 'carousel';
const initDims = dimsFor('3:4');

export const useSceneStore = create<SceneState>((set, get) => ({
  activeTemplateId: INITIAL_TEMPLATE,
  values: defaultsFor(INITIAL_TEMPLATE),
  easing: easingFor(INITIAL_TEMPLATE),

  frame: 0,
  fps: 30,
  duration: 8,
  playing: true, // autoplay loop by default

  aspect: '3:4',
  width: initDims.width,
  height: initDims.height,
  customW: initDims.width,
  customH: initDims.height,
  safeArea: false,
  background: { source: 'color', color: '#0d0d0d', gradient: false, color2: '#1f1f1f', imageUrl: null, blur: 28 },
  logo: { url: null, position: 'br', size: 96 },
  audioUrl: null,

  // start populated with the bundled demo set so every template shows real motion
  assets: DEMO_ASSETS.map((a) => ({ ...a, id: nid('asset'), visible: true, origin: 'remote' as const })),
  cardShape: 'auto',
  videoEnd: 'loop',
  effects: [],
  customPresets: [],

  setValue: (key, val) =>
    set((s) => ({ values: { ...s.values, [key]: val } })),

  // full reset on template switch: wipe bag, refill from declared defaults,
  // and seed the scene easing from the template's default curve.
  setActiveTemplate: (id) =>
    set(() => ({ activeTemplateId: id, values: defaultsFor(id), easing: easingFor(id), frame: 0 })),

  setEasing: (easing) => set(() => ({ easing })),

  // "Reset all values": restore the active template's declared defaults + easing.
  resetValues: () =>
    set((s) => ({ values: defaultsFor(s.activeTemplateId), easing: easingFor(s.activeTemplateId) })),

  setFrame: (frame) => set(() => ({ frame })),
  setPlaying: (p) => set(() => ({ playing: p })),

  setFps: (fps) => set(() => ({ fps })),
  setAspect: (aspect) =>
    set(() => ({ aspect, ...dimsFor(aspect) })),
  // Custom canvas: preview stays normalized to BASE on the longest edge so
  // template layout keeps its proportions; the exact pixels apply at export.
  setCustomDims: (w, h) =>
    set(() => {
      const cw = Math.min(8192, Math.max(16, Math.round(w) || 16));
      const ch = Math.min(8192, Math.max(16, Math.round(h) || 16));
      const k = BASE / Math.max(cw, ch);
      return {
        aspect: 'custom',
        customW: cw,
        customH: ch,
        width: Math.max(2, Math.round(cw * k)),
        height: Math.max(2, Math.round(ch * k)),
      };
    }),
  setDuration: (d) => set(() => ({ duration: d })),
  toggleSafeArea: () => set((s) => ({ safeArea: !s.safeArea })),
  setBackground: (patch) => set((s) => ({ background: { ...s.background, ...patch } })),
  setLogo: (patch) => set((s) => ({ logo: { ...s.logo, ...patch } })),
  setAudioUrl: (url) => set(() => ({ audioUrl: url })),

  addAssets: (items) => {
    const added: AssetItem[] = items.map(({ blob, ...it }) => {
      const id = nid('asset');
      const origin: 'remote' | 'upload' = blob || it.url.startsWith('blob:') ? 'upload' : (it.origin ?? 'remote');
      if (blob) idbPut(id, blob).catch(() => { /* quota — this upload won't persist */ });
      return { ...it, id, visible: true, origin };
    });
    set((s) => ({ assets: [...s.assets, ...added] }));
  },
  // Set the image at a specific slot; appends if the slot is the next empty one.
  // A new image gets a fresh (centre) crop — the old focal point rarely fits it.
  replaceAssetAt: (index, item) => {
    const { blob, ...it } = item;
    const origin: 'remote' | 'upload' = blob || it.url.startsWith('blob:') ? 'upload' : (it.origin ?? 'remote');
    set((s) => {
      const next = s.assets.slice();
      if (index < next.length) {
        const prev = next[index];
        if (prev.origin === 'upload') idbDelete(prev.id).catch(() => {}); // drop the replaced upload's bytes
        if (blob) idbPut(prev.id, blob).catch(() => {});                  // store new bytes under the kept id
        next[index] = { ...prev, name: it.name, url: it.url, kind: it.kind, origin, crop: undefined };
      } else {
        const id = nid('asset');
        if (blob) idbPut(id, blob).catch(() => {});
        next.push({ ...it, id, visible: true, origin });
      }
      return { assets: next };
    });
  },
  removeAsset: (id) => {
    const a = get().assets.find((x) => x.id === id);
    if (a?.origin === 'upload') idbDelete(id).catch(() => {});
    set((s) => ({ assets: s.assets.filter((x) => x.id !== id) }));
  },
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
  clearAssets: () => {
    for (const a of get().assets) if (a.origin === 'upload') idbDelete(a.id).catch(() => {});
    set(() => ({ assets: [] }));
  },
  setAssetCrop: (id, crop) =>
    set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, crop } : a)) })),
  setAllAssetCrops: (crop) =>
    set((s) => ({ assets: s.assets.map((a) => ({ ...a, crop })) })),
  setCardShape: (shape) => set(() => ({ cardShape: shape })),
  setVideoEnd: (mode) => set(() => ({ videoEnd: mode })),

  // Apply a persisted scene (from lib/scenePersist). `values` is merged over the
  // template's current defaults so a saved scene survives added/removed controls.
  hydrate: (partial) =>
    set((s) => {
      const tid = partial.activeTemplateId ?? s.activeTemplateId;
      let templateOk = true;
      try { defaultsFor(tid); } catch { templateOk = false; } // stale/removed template → keep current
      const assets = partial.assets ?? s.assets;
      seedIdCounter(assets);
      return {
        ...s,
        ...partial,
        activeTemplateId: templateOk ? tid : s.activeTemplateId,
        values: templateOk ? { ...defaultsFor(tid), ...(partial.values ?? {}) } : s.values,
        frame: 0, // always start at the clip head
      };
    }),

  // Rebuild object URLs for uploaded assets from their IndexedDB bytes. Runs after
  // hydrate; assets whose bytes are gone (evicted/quota) keep an empty url and
  // fall back to the numbered placeholder.
  rehydrateUploads: async () => {
    const uploads = get().assets.filter((a) => a.origin === 'upload' && !a.url);
    if (uploads.length === 0) return;
    const resolved = await Promise.all(
      uploads.map(async (a) => {
        const blob = await idbGet(a.id).catch(() => undefined);
        return { id: a.id, url: blob ? URL.createObjectURL(blob) : '' };
      }),
    );
    const urls = new Map(resolved.map((r) => [r.id, r.url]));
    set((s) => ({
      assets: s.assets.map((a) =>
        a.origin === 'upload' && urls.get(a.id) ? { ...a, url: urls.get(a.id)! } : a,
      ),
    }));
  },

  // Loaded lazily on the client (localStorage isn't available during SSR,
  // and seeding it at create() time would cause a hydration mismatch).
  loadCustomPresets: () =>
    set(() => {
      if (typeof window === 'undefined') return {};
      try {
        const raw = localStorage.getItem(PRESETS_KEY);
        return raw ? { customPresets: JSON.parse(raw) as CustomPreset[] } : {};
      } catch { return {}; }
    }),
  saveCustomPreset: (name) =>
    set((s) => {
      const preset: CustomPreset = {
        id: `custom_${Date.now().toString(36)}_${s.customPresets.length}`,
        name,
        templateId: s.activeTemplateId,
        values: { ...s.values },
        easing: s.easing,
      };
      const next = [...s.customPresets, preset];
      persistPresets(next);
      return { customPresets: next };
    }),
  applyCustomPreset: (id) =>
    set((s) => {
      const p = s.customPresets.find((c) => c.id === id);
      if (!p) return {};
      // merge over current defaults so presets survive template control changes
      return {
        activeTemplateId: p.templateId,
        values: { ...defaultsFor(p.templateId), ...p.values },
        easing: p.easing,
        frame: 0,
      };
    }),
  deleteCustomPreset: (id) =>
    set((s) => {
      const next = s.customPresets.filter((c) => c.id !== id);
      persistPresets(next);
      return { customPresets: next };
    }),

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
