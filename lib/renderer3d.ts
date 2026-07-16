import * as THREE from 'three';
import { getTemplate } from '@/templates';
import { useSceneStore } from '@/store/useSceneStore';
import { resolveEasing } from '@/lib/easing';
import { assetIndexForSlot, clamp, lerp } from '@/lib/motion';
import { loadImage } from '@/lib/textureLoad';
import type { IRenderer } from '@/lib/rendererTypes';

// Shared with the Pixi renderer so control values read identically in px.
const SPRITE_BASE = 340;
const PLACEHOLDER_FILL = '#242424';
const PLACEHOLDER_LABEL = '#555555';

interface Slot3D {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  texW: number;
  texH: number;
  cornerR: number; // cached rounded-corner fraction (-1 = unset)
}

// Rounded-rectangle alpha mask (white on black) for cornerRadius; cached by
// (fraction, aspect) so corners stay circular on non-square cards.
function makeCornerAlphaMap(fracR: number, aspect: number): THREE.CanvasTexture {
  const W = 512;
  const H = Math.max(2, Math.round(W / aspect));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  const r = (Math.min(W, H) / 2) * fracR;
  g.beginPath();
  g.roundRect(0, 0, W, H, r);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// 2-stop vertical gradient texture for the scene backdrop.
function makeGradientTexture(c1: string, c2: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Numbered placeholder card as a CanvasTexture (mirrors the Pixi placeholder).
function makePlaceholderTexture(label: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 480; c.height = 600;
  const g = c.getContext('2d')!;
  g.fillStyle = PLACEHOLDER_FILL;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = PLACEHOLDER_LABEL;
  g.font = '600 130px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(label, c.width / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Real-3D renderer for templates with meta.engine === 'webgl'. Implements the
// same IRenderer contract as the Pixi SceneRenderer, so preview and export are
// engine-agnostic. M1 scope: cards + solid/gradient-as-solid background; no
// effects, image/card backgrounds, logo, safe-area, or cornerRadius yet.
export class SceneRenderer3D implements IRenderer {
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 1, 40000);
  private slots: Slot3D[] = [];
  private textureCache = new Map<string, THREE.Texture>();
  private placeholders = new Map<number, THREE.CanvasTexture>();
  private cornerMaps = new Map<string, THREE.CanvasTexture>();
  private gradientTex: THREE.CanvasTexture | null = null;
  private gradientSig = '';
  // HUD overlay (logo + safe-area) rendered orthographically on top.
  private hud = new THREE.Scene();
  private hudCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  private logoMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private logoUrl = '';
  private safeLine: THREE.LineLoop | null = null;
  private width = 810;
  private height = 1080;
  private lastCountSig = -1;
  private lastAssetSig = '';
  ready = false;

  async init(canvas: HTMLCanvasElement) {
    const s = useSceneStore.getState();
    this.width = s.width;
    this.height = s.height;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true, // required for toDataURL export capture
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.width, this.height, false);
    this.ready = true;
    this.syncAssets();
  }

  resize(width: number, height: number, resolution = 1) {
    if (!this.ready) return;
    this.width = width;
    this.height = height;
    this.renderer.setPixelRatio(resolution);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setCaptureScale(k: number) {
    const { width, height } = useSceneStore.getState();
    this.resize(width, height, k);
  }

  // Map the house `perspective` control (0–200) onto the camera: low values =
  // long lens (near-ortho), high = wide-angle. Camera distance keeps the z=0
  // plane at exact preview-pixel scale for any fov.
  private updateCamera(perspective: number) {
    const fov = lerp(15, 95, clamp(perspective, 0, 200) / 200);
    this.camera.fov = fov;
    this.camera.aspect = this.width / this.height;
    const D = (this.height / 2) / Math.tan((fov * Math.PI) / 360);
    this.camera.position.set(0, 0, D);
    this.camera.lookAt(0, 0, 0);
    this.camera.far = D * 8;
    this.camera.updateProjectionMatrix();
  }

  syncAssets() {
    if (!this.ready) return;
    const s = useSceneStore.getState();
    const count = Math.max(1, Math.round(s.values.count ?? 6));
    const repeat = getTemplate(s.activeTemplateId).meta.repeatAssets === true;
    const assetSig = (repeat ? 'R|' : '') + s.assets.map((a) => a.id + ':' + a.url + ':' + a.visible).join('|');
    if (count === this.lastCountSig && assetSig === this.lastAssetSig) return;
    this.lastCountSig = count;
    this.lastAssetSig = assetSig;

    while (this.slots.length < count) {
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
      this.scene.add(mesh);
      this.slots.push({ mesh, texW: 480, texH: 600, cornerR: -1 });
    }
    while (this.slots.length > count) {
      const slot = this.slots.pop()!;
      this.scene.remove(slot.mesh);
      slot.mesh.geometry.dispose();
      slot.mesh.material.dispose();
    }

    this.slots.forEach((slot, i) => {
      const asset = s.assets[assetIndexForSlot(i, s.assets.length, repeat)];
      if (!asset || !asset.visible) {
        let ph = this.placeholders.get(i);
        if (!ph) { ph = makePlaceholderTexture(String(i + 1)); this.placeholders.set(i, ph); }
        slot.mesh.material.map = ph;
        slot.mesh.material.needsUpdate = true;
        slot.texW = 480; slot.texH = 600;
      } else {
        const cached = this.textureCache.get(asset.url);
        if (cached) {
          slot.mesh.material.map = cached;
          slot.mesh.material.needsUpdate = true;
          const img = cached.image as HTMLImageElement;
          slot.texW = img.width; slot.texH = img.height;
        } else {
          loadImage(asset.url).then((img) => {
            if (!img || !this.ready) return;
            const tex = new THREE.Texture(img);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            this.textureCache.set(asset.url, tex);
            slot.mesh.material.map = tex;
            slot.mesh.material.needsUpdate = true;
            slot.texW = img.width; slot.texH = img.height;
            slot.cornerR = -1; // aspect changed → rebuild the corner mask
          });
        }
      }
    });
  }

  // Rounded corners via a cached alpha mask (Pixi uses a stencil mask).
  private applyCorner(slot: Slot3D, cornerRadiusPct: number) {
    const fracR = clamp(cornerRadiusPct / 100, 0, 1);
    if (slot.cornerR === fracR) return;
    slot.cornerR = fracR;
    if (fracR === 0) {
      slot.mesh.material.alphaMap = null;
      slot.mesh.material.needsUpdate = true;
      return;
    }
    const aspect = slot.texW / slot.texH;
    const key = `${fracR.toFixed(2)}|${aspect.toFixed(2)}`;
    let map = this.cornerMaps.get(key);
    if (!map) { map = makeCornerAlphaMap(fracR, aspect); this.cornerMaps.set(key, map); }
    slot.mesh.material.alphaMap = map;
    slot.mesh.material.needsUpdate = true;
  }

  // Backdrop + HUD (logo, safe-area) sync from the store.
  private syncScenery() {
    const s = useSceneStore.getState();

    // background: solid or 2-stop gradient (image/card sources fall back)
    if (s.background.source === 'color' && s.background.gradient) {
      const sig = s.background.color + '|' + s.background.color2;
      if (this.gradientSig !== sig) {
        this.gradientTex?.dispose();
        this.gradientTex = makeGradientTexture(s.background.color, s.background.color2);
        this.gradientSig = sig;
      }
      this.scene.background = this.gradientTex;
    } else {
      this.scene.background = new THREE.Color(s.background.color);
    }

    // HUD ortho camera matches the logical canvas (y up; positions flipped)
    this.hudCam.left = -this.width / 2;
    this.hudCam.right = this.width / 2;
    this.hudCam.top = this.height / 2;
    this.hudCam.bottom = -this.height / 2;
    this.hudCam.updateProjectionMatrix();

    // safe-area guide (5% inset, cyan) — mirrors the Pixi overlay
    if (s.safeArea) {
      if (!this.safeLine) {
        const geo = new THREE.BufferGeometry();
        const mat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6 });
        this.safeLine = new THREE.LineLoop(geo, mat);
        this.hud.add(this.safeLine);
      }
      const mx = this.width * 0.05, my = this.height * 0.05;
      const w2 = this.width / 2 - mx, h2 = this.height / 2 - my;
      this.safeLine.geometry.setFromPoints([
        new THREE.Vector3(-w2, -h2, 0), new THREE.Vector3(w2, -h2, 0),
        new THREE.Vector3(w2, h2, 0), new THREE.Vector3(-w2, h2, 0),
      ]);
      this.safeLine.visible = true;
    } else if (this.safeLine) {
      this.safeLine.visible = false;
    }

    // logo overlay in the chosen corner
    if (s.logo.url) {
      if (!this.logoMesh) {
        this.logoMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false })
        );
        this.hud.add(this.logoMesh);
      }
      if (this.logoUrl !== s.logo.url) {
        this.logoUrl = s.logo.url;
        loadImage(s.logo.url).then((img) => {
          if (!img || !this.ready || !this.logoMesh) return;
          const tex = new THREE.Texture(img);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.needsUpdate = true;
          this.logoMesh.material.map = tex;
          this.logoMesh.material.needsUpdate = true;
          this.logoMesh.userData.aspect = img.width / img.height;
        });
      }
      const aspect: number = this.logoMesh.userData.aspect ?? 1;
      const size = s.logo.size;
      const w = aspect >= 1 ? size : size * aspect;
      const h = aspect >= 1 ? size / aspect : size;
      const pad = 24;
      const px = s.logo.position.includes('r') ? this.width / 2 - pad - w / 2 : -this.width / 2 + pad + w / 2;
      const py = s.logo.position.startsWith('t') ? this.height / 2 - pad - h / 2 : -this.height / 2 + pad + h / 2;
      this.logoMesh.position.set(px, py, 0);
      this.logoMesh.scale.set(w, h, 1);
      this.logoMesh.visible = !!this.logoMesh.material.map;
    } else if (this.logoMesh) {
      this.logoMesh.visible = false;
    }
  }

  getFrameState(frame: number) {
    if (!this.ready) return;
    const s = useSceneStore.getState();
    this.syncAssets();
    this.syncScenery();

    this.updateCamera(Number(s.values.perspective ?? 100));

    const template = getTemplate(s.activeTemplateId);
    const count = this.slots.length;
    const ease = resolveEasing(s.easing);
    const easedPhase = (phase: number) => {
      const base = Math.floor(phase);
      return base + ease(phase - base);
    };
    const ctx = {
      fps: s.fps, width: s.width, height: s.height,
      duration: s.duration,
      totalFrames: Math.max(1, Math.round(s.duration * s.fps)),
      ease, easedPhase,
    };

    for (let i = 0; i < count; i++) {
      const slot = this.slots[i];
      const norm = SPRITE_BASE / Math.max(slot.texW, slot.texH);
      this.applyCorner(slot, Number(s.values.cornerRadius ?? 0));
      if (template.transform3d) {
        const t = template.transform3d(frame, i, count, s.values, ctx);
        slot.mesh.position.set(t.x, -t.y, t.z); // canvas y-down → three y-up
        slot.mesh.rotation.set(t.rotationX ?? 0, t.rotationY ?? 0, t.rotationZ ?? 0);
        slot.mesh.scale.set(slot.texW * norm * t.scale, slot.texH * norm * t.scale, 1);
        slot.mesh.material.opacity = t.alpha;
        slot.mesh.visible = t.alpha > 0.001 && t.scale > 0.0001;
      } else {
        // fallback: project the 2D transform onto the z=0 plane
        const t = template.transform(frame, i, count, s.values, ctx);
        slot.mesh.position.set(t.x, -t.y, t.depth);
        slot.mesh.rotation.set(0, 0, -t.rotation);
        slot.mesh.scale.set(slot.texW * norm * t.scale * (t.scaleX ?? 1), slot.texH * norm * t.scale * (t.scaleY ?? 1), 1);
        slot.mesh.material.opacity = t.alpha;
        slot.mesh.visible = t.alpha > 0.001 && t.scale > 0.0001;
      }
    }
  }

  renderFrame(frame: number) {
    if (!this.ready) return;
    this.getFrameState(frame);
    this.renderer.render(this.scene, this.camera);
    // HUD pass (logo + safe-area) drawn on top without clearing
    this.renderer.autoClear = false;
    this.renderer.render(this.hud, this.hudCam);
    this.renderer.autoClear = true;
  }

  captureFrame(frame: number): string {
    this.renderFrame(frame);
    return this.renderer.domElement.toDataURL('image/png');
  }

  destroy() {
    this.ready = false;
    for (const slot of this.slots) {
      this.scene.remove(slot.mesh);
      slot.mesh.geometry.dispose();
      slot.mesh.material.dispose();
    }
    this.slots = [];
    this.textureCache.forEach((t) => t.dispose());
    this.textureCache.clear();
    this.placeholders.forEach((t) => t.dispose());
    this.placeholders.clear();
    this.cornerMaps.forEach((t) => t.dispose());
    this.cornerMaps.clear();
    this.gradientTex?.dispose();
    if (this.logoMesh) { this.logoMesh.geometry.dispose(); this.logoMesh.material.map?.dispose(); this.logoMesh.material.dispose(); }
    if (this.safeLine) { this.safeLine.geometry.dispose(); (this.safeLine.material as THREE.Material).dispose(); }
    try {
      this.renderer.dispose();
      this.renderer.forceContextLoss(); // avoid WebGL context accumulation on engine swaps
    } catch { /* already lost */ }
  }
}
