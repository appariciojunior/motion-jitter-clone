import { useSceneStore, type SceneState } from '@/store/useSceneStore';

// Client-side scene persistence. Settings live in localStorage; uploaded media
// bytes live in IndexedDB (see lib/assetDb). A refresh restores the full working
// state instead of resetting to defaults.
//
// Why hand-rolled instead of zustand's persist middleware: `frame` changes every
// animation frame during playback. The middleware re-serializes and writes on
// EVERY store change, which would hammer localStorage ~30–60×/s. Here the auto-
// save is throttled and skips the write when the persisted slice is unchanged,
// so playback (frame-only churn) never touches disk.

export const SCENE_KEY = 'motion-scene-v1';

// The persisted slice — everything except the transient clock (frame/playing)
// and separately-stored custom presets. Uploaded assets keep only metadata; their
// url is rebuilt from IndexedDB on load, so a dead blob: string is never saved.
export function buildScenePartial(s: SceneState) {
  return {
    activeTemplateId: s.activeTemplateId,
    values: s.values,
    easing: s.easing,
    fps: s.fps,
    duration: s.duration,
    aspect: s.aspect,
    width: s.width,
    height: s.height,
    customW: s.customW,
    customH: s.customH,
    safeArea: s.safeArea,
    // blob-backed logo/background images aren't persisted (they'd be dead on
    // reload); remote/color backgrounds and logos restore normally.
    background: s.background.imageUrl?.startsWith('blob:')
      ? { ...s.background, imageUrl: null }
      : s.background,
    logo: s.logo.url?.startsWith('blob:') ? { ...s.logo, url: null } : s.logo,
    cardShape: s.cardShape,
    videoEnd: s.videoEnd,
    effects: s.effects,
    assets: s.assets.map((a) => (a.origin === 'upload' ? { ...a, url: '' } : a)),
  };
}

export type ScenePartial = ReturnType<typeof buildScenePartial>;

// Read the saved scene, or null when absent/corrupt.
export function loadScene(): ScenePartial | null {
  try {
    const raw = localStorage.getItem(SCENE_KEY);
    return raw ? (JSON.parse(raw) as ScenePartial) : null;
  } catch {
    return null;
  }
}

// Start throttled auto-save. Returns an unsubscribe. At most one write every
// ~500ms, and only when the serialized slice actually changed — so play/scrub
// (frame churn) produces zero writes.
export function startSceneAutosave(): () => void {
  let lastSig = '';
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    try {
      const sig = JSON.stringify(buildScenePartial(useSceneStore.getState()));
      if (sig !== lastSig) {
        lastSig = sig;
        localStorage.setItem(SCENE_KEY, sig);
      }
    } catch {
      /* quota exceeded or serialize error — skip this write, non-fatal */
    }
  };
  return useSceneStore.subscribe(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(flush, 500);
  });
}
