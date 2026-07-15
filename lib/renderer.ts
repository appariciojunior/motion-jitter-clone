import * as PIXI from 'pixi.js';
import { PixelateFilter } from 'pixi-filters';
import { getTemplate } from '@/templates';
import { getEffect } from '@/effects';
import { useSceneStore, type SceneState } from '@/store/useSceneStore';
import { layerTimingState } from '@/lib/timing';

// Reference base long-edge (px) shared with templates (carousel BASE = 340),
// so control values read directly in on-screen pixels.
const SPRITE_BASE = 340;

// Monochrome placeholder card colour (a touch above --card-inset for contrast
// against the --frame backdrop) and its faint index label colour.
const PLACEHOLDER_FILL = 0x242424;
const PLACEHOLDER_LABEL = 0x6a6a6a;

interface Slot {
  container: PIXI.Container;
  sprite: PIXI.Sprite;
  mask: PIXI.Graphics;
  label: PIXI.Text;
  texW: number;
  texH: number;
  cornerR: number; // last-applied corner radius fraction, for mask caching
}

// A single white rounded texture, tinted per placeholder card.
function makePlaceholderTexture(app: PIXI.Application): PIXI.Texture {
  const g = new PIXI.Graphics();
  g.roundRect(0, 0, 480, 600, 8).fill(0xffffff);
  return app.renderer.generateTexture(g);
}

export class SceneRenderer {
  app: PIXI.Application;
  private content = new PIXI.Container();       // bg + motion (effects applied here)
  private bg = new PIXI.Graphics();
  private bgSprite = new PIXI.Sprite();          // image / card-reflected background
  private bgBlur = new PIXI.BlurFilter({ strength: 28, quality: 4 });
  private motion = new PIXI.Container();         // card sprites
  private overlay = new PIXI.Container();        // logo/safe-area (unfiltered)
  private safeGfx = new PIXI.Graphics();
  private logoSprite: PIXI.Sprite | null = null;
  private placeholder!: PIXI.Texture;
  private textureCache = new Map<string, PIXI.Texture>();
  private texturePromises = new Map<string, Promise<PIXI.Texture | null>>();
  private slots: Slot[] = [];
  private ready = false;

  private lastAssetsRef: SceneState['assets'] | null = null;
  private lastCountSig = -1;
  private lastEffectsRef: SceneState['effects'] | null = null;
  private lastOverlaySig = '';
  private bgImageUrl = '';                        // last-loaded uploaded bg url
  private bgImageTex: PIXI.Texture | null = null;

  constructor(private readonly invalidate: () => void = () => {}) {
    this.app = new PIXI.Application();
  }

  async init(canvas: HTMLCanvasElement) {
    const { width, height } = useSceneStore.getState();
    await this.app.init({
      canvas,
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      autoStart: false,          // we drive rendering ourselves
      preference: 'webgl',
      resolution: 1,
      preserveDrawingBuffer: true, // so toDataURL reads real pixels during export
    });

    this.motion.sortableChildren = true;
    this.bgSprite.anchor.set(0.5);
    this.bgSprite.visible = false;
    this.bgSprite.filters = [this.bgBlur];
    this.content.addChild(this.bg, this.bgSprite, this.motion);
    this.app.stage.addChild(this.content, this.overlay);
    this.overlay.addChild(this.safeGfx);

    this.placeholder = makePlaceholderTexture(this.app);
    this.ready = true;
    this.resize(width, height);
    this.syncAssets();
  }

  resize(width: number, height: number) {
    if (!this.ready) return;
    this.app.renderer.resize(width, height);
    this.motion.position.set(width / 2, height / 2);
    this.bgSprite.position.set(width / 2, height / 2);
    this.content.filterArea = new PIXI.Rectangle(0, 0, width, height);
    this.overlay.position.set(0, 0);
  }

  // ---- asset / slot management ----
  // Loads via HTMLImageElement instead of PIXI.Assets: uploads are blob: URLs
  // with no file extension, which Assets can't route to a parser (resolves null).
  private async loadTexture(url: string): Promise<PIXI.Texture | null> {
    const cached = this.textureCache.get(url);
    if (cached) return cached;
    const pending = this.texturePromises.get(url);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const tex = PIXI.Texture.from(img);
        this.textureCache.set(url, tex);
        return tex;
      } catch {
        return null; // unreadable/revoked URL — caller keeps the placeholder
      } finally {
        this.texturePromises.delete(url);
      }
    })();

    this.texturePromises.set(url, promise);
    return promise;
  }

  // Rebuild the sprite pool to match count; slot i binds to asset i (positional,
  // 1:1 with the Assets panel). Empty/hidden slots fall back to a numbered card.
  syncAssets() {
    if (!this.ready) return;
    const s = useSceneStore.getState();
    const count = Math.max(1, Math.round(s.values.count ?? 6));

    if (count === this.lastCountSig && s.assets === this.lastAssetsRef) return;
    this.lastCountSig = count;
    this.lastAssetsRef = s.assets;

    // grow / shrink pool
    while (this.slots.length < count) {
      const container = new PIXI.Container();
      const sprite = new PIXI.Sprite(this.placeholder);
      sprite.anchor.set(0.5);
      const mask = new PIXI.Graphics();
      sprite.mask = mask;
      const label = new PIXI.Text({
        text: '',
        style: { fill: PLACEHOLDER_LABEL, fontSize: 130, fontWeight: '600', fontFamily: 'Inter, system-ui, sans-serif' },
      });
      label.anchor.set(0.5);
      container.addChild(sprite, mask, label);
      this.motion.addChild(container);
      this.slots.push({ container, sprite, mask, label, texW: 480, texH: 600, cornerR: -1 });
    }
    while (this.slots.length > count) {
      const slot = this.slots.pop()!;
      slot.container.destroy({ children: true });
    }

    // assign textures — slot i ↔ asset i; missing/hidden → numbered placeholder
    this.slots.forEach((slot, i) => {
      const asset = s.assets[i];
      if (!asset || !asset.visible) {
        slot.sprite.texture = this.placeholder;
        slot.sprite.tint = PLACEHOLDER_FILL;
        slot.label.text = String(i + 1);
        slot.label.visible = true;
        slot.texW = 480; slot.texH = 600; slot.cornerR = -1;
      } else {
        slot.sprite.tint = 0xffffff;
        slot.label.visible = false;
        this.loadTexture(asset.url).then((tex) => {
          if (!tex || slot.sprite.destroyed) return; // slot may be gone by now
          slot.sprite.texture = tex;
          slot.texW = tex.width; slot.texH = tex.height; slot.cornerR = -1;
          this.invalidate();
        });
      }
    });
  }

  private applyMask(slot: Slot, cornerRadiusPct: number) {
    const frac = Math.max(0, Math.min(1, cornerRadiusPct / 100));
    if (slot.cornerR === frac) return; // cached
    slot.cornerR = frac;
    const w = slot.texW, h = slot.texH;
    const r = (Math.min(w, h) / 2) * frac;
    slot.mask.clear();
    slot.mask.roundRect(-w / 2, -h / 2, w, h, r).fill(0xffffff);
  }

  // ---- effects ----
  private syncEffects() {
    const s = useSceneStore.getState();
    if (s.effects === this.lastEffectsRef) return;
    this.lastEffectsRef = s.effects;
    const active = s.effects.filter((e) => e.enabled);

    const filters: PIXI.Filter[] = [];
    for (const e of active) {
      const def = getEffect(e.effectId);
      if (!def) continue;
      try {
        filters.push(def.createFilter(e.values));
      } catch { /* skip bad filter */ }
    }
    this.content.filters = filters.length ? filters : [];
  }

  // ---- overlays ----
  private drawOverlays(s: SceneState) {
    const { width, height } = s;
    const sig = [
      width, height, s.safeArea,
      s.background.color, s.background.gradient, s.background.color2,
      s.logo.url, s.logo.position, s.logo.size,
    ].join('|');
    if (sig === this.lastOverlaySig) return;
    this.lastOverlaySig = sig;

    // background
    this.bg.clear();
    if (s.background.gradient) {
      const grad = new PIXI.FillGradient(0, 0, 0, height);
      grad.addColorStop(0, s.background.color);
      grad.addColorStop(1, s.background.color2);
      this.bg.rect(0, 0, width, height).fill(grad);
    } else {
      this.bg.rect(0, 0, width, height).fill(s.background.color);
    }

    // safe area guide
    this.safeGfx.clear();
    if (s.safeArea) {
      const mx = width * 0.05, my = height * 0.05;
      this.safeGfx
        .rect(mx, my, width - mx * 2, height - my * 2)
        .stroke({ width: 2, color: 0x00e5ff, alpha: 0.6 });
    }

    // logo
    if (s.logo.url) {
      if (!this.logoSprite) {
        this.logoSprite = new PIXI.Sprite();
        this.logoSprite.anchor.set(0.5);
        this.overlay.addChild(this.logoSprite);
      }
      this.loadTexture(s.logo.url).then((tex) => {
        if (!tex || !this.logoSprite || this.logoSprite.destroyed) return;
        this.logoSprite.texture = tex;
        const scale = s.logo.size / Math.max(tex.width, tex.height);
        this.logoSprite.scale.set(scale);
        this.invalidate();
      });
      const pad = 32;
      const half = s.logo.size / 2;
      const px = s.logo.position.includes('r') ? width - pad - half : pad + half;
      const py = s.logo.position.startsWith('t') ? pad + half : height - pad - half;
      this.logoSprite.position.set(px, py);
      this.logoSprite.visible = true;
    } else if (this.logoSprite) {
      this.logoSprite.visible = false;
    }
  }

  // Image / card-reflected background. Called every frame (outside the overlay
  // sig cache) so the 'card' source can follow the featured card's live position.
  private updateBackground(
    s: SceneState,
    featured: { tex: PIXI.Texture; x: number; y: number } | null,
  ) {
    const bg = s.background;
    const { width, height } = s;

    let tex: PIXI.Texture | null = null;
    let follow = false;
    if (bg.source === 'image') {
      if (bg.imageUrl && bg.imageUrl !== this.bgImageUrl) {
        this.bgImageUrl = bg.imageUrl;
        this.bgImageTex = null;
        this.loadTexture(bg.imageUrl).then((t) => { if (t) { this.bgImageTex = t; this.invalidate(); } });
      }
      if (!bg.imageUrl) { this.bgImageUrl = ''; this.bgImageTex = null; }
      tex = this.bgImageTex;
    } else if (bg.source === 'card' && featured) {
      tex = featured.tex;
      follow = true;
    }

    if (!tex) { this.bgSprite.visible = false; return; }

    this.bgSprite.visible = true;
    this.bgSprite.texture = tex;
    const cover = Math.max(width / tex.width, height / tex.height) * 1.4; // headroom for drift
    this.bgSprite.scale.set(cover);
    const k = follow ? 0.18 : 0; // 'card' bg drifts with the featured card
    this.bgSprite.position.set(width / 2 + (featured?.x ?? 0) * k, height / 2 + (featured?.y ?? 0) * k);
    this.bgBlur.strength = Math.max(0, bg.blur);
  }

  /**
   * THE single clock. Realizes the full scene onto the stage for `frame`.
   * Both live preview and export capture call this — WYSIWYG guarantee.
   * Reads the live store every call (principle 1).
   */
  getFrameState(frame: number) {
    if (!this.ready) return;
    const s = useSceneStore.getState();

    this.syncAssets();
    this.syncEffects();
    this.drawOverlays(s);

    const template = getTemplate(s.activeTemplateId);
    const count = this.slots.length;
    const motionDuration = Number(s.values.duration ?? s.timelineDuration);
    const cycles = Number(s.values.cycles ?? 1);
    const delay = Number(s.values.delay ?? 0);
    const stagger = Number(s.values.stagger ?? 0);

    // Track the featured (front-most) card so a 'card' background can reflect it.
    let featured: { tex: PIXI.Texture; x: number; y: number } | null = null;
    let featuredDepth = -Infinity;

    for (let i = 0; i < count; i++) {
      const slot = this.slots[i];
      const timing = layerTimingState({
        frame,
        fps: s.fps,
        duration: motionDuration,
        cycles,
        delay,
        stagger,
        group: template.meta.group,
        index: i,
        count,
        direction: s.values.direction,
        easing: s.easing,
      });
      const ctx = {
        fps: s.fps,
        width: s.width,
        height: s.height,
        elapsed: timing.elapsed,
        progress: timing.progress,
      };
      const t = template.transform(timing.localFrame, i, count, s.values, ctx);
      const norm = SPRITE_BASE / Math.max(slot.texW, slot.texH);
      slot.container.position.set(t.x, t.y);
      slot.container.scale.set(norm * t.scale);
      slot.container.rotation = t.rotation;
      slot.container.alpha = t.alpha;
      slot.container.skew.set(t.skewX ?? 0, t.skewY ?? 0);
      slot.container.zIndex = t.depth * 1000;
      this.applyMask(slot, s.values.cornerRadius ?? 0);

      if (t.depth > featuredDepth && t.alpha > 0.15) {
        featuredDepth = t.depth;
        featured = { tex: slot.sprite.texture, x: t.x, y: t.y };
      }
    }

    this.updateBackground(s, featured);
  }

  // Realize + render a frame synchronously (used by export).
  renderFrame(frame: number) {
    this.getFrameState(frame);
    this.app.renderer.render(this.app.stage);
  }

  // Deterministic capture: realize frame, render, read pixels as PNG data URL.
  captureFrame(frame: number): string {
    this.renderFrame(frame);
    return (this.app.canvas as HTMLCanvasElement).toDataURL('image/png');
  }

  extractCanvas(): HTMLCanvasElement {
    return this.app.canvas as HTMLCanvasElement;
  }

  destroy() {
    this.ready = false;
    try { this.app.destroy(true, { children: true, texture: false }); } catch { /* noop */ }
  }
}
