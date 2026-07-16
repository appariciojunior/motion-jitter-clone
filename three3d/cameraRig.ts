import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ── Camera rig ──────────────────────────────────────────────────────────────
// Lets the view gizmo drive the same camera OrbitControls owns. OrbitControls
// re-derives its spherical state from camera.position on every update(), so
// writing the position straight back is enough — no reaching into internals.
// `update()` must be called from the render loop, before controls.update().

export type AxisKey = 'x' | 'y' | 'z';
export type AxisSign = 1 | -1;

export interface CameraRig {
  getQuaternion(out: THREE.Quaternion): THREE.Quaternion;  // gizmo reads per frame
  orbit(dxPx: number, dyPx: number): void;                 // gizmo drag
  snapTo(axis: AxisKey, sign: AxisSign): void;             // gizmo double-click
  update(): void;
}

const EPS = 1e-4;
const SNAP_MS = 320;
const DRAG_SPEED = 0.006;   // radians per pixel of gizmo drag

const _off = new THREE.Vector3();
const _sph = new THREE.Spherical();

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Signed shortest way round the circle from a to b, so a snap never takes the
// long way about.
function shortestDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function makeCameraRig(camera: THREE.PerspectiveCamera, controls: OrbitControls): CameraRig {
  let anim: { t0: number; fromTheta: number; fromPhi: number; toTheta: number; toPhi: number } | null = null;

  // THREE.Spherical is theta = atan2(x, z), phi = acos(y / r): +Z is theta 0,
  // +X is theta π/2, +Y is phi 0.
  function read(): THREE.Spherical {
    _off.copy(camera.position).sub(controls.target);
    return _sph.setFromVector3(_off);
  }
  function write(sph: THREE.Spherical): void {
    sph.phi = Math.max(EPS, Math.min(Math.PI - EPS, sph.phi));
    camera.position.copy(controls.target).add(_off.setFromSpherical(sph));
    camera.lookAt(controls.target);
  }

  return {
    getQuaternion(out) {
      return out.copy(camera.quaternion);
    },

    orbit(dxPx, dyPx) {
      anim = null;   // grabbing the gizmo cancels an in-flight snap
      const s = read();
      s.theta -= dxPx * DRAG_SPEED;
      s.phi -= dyPx * DRAG_SPEED;
      write(s);
    },

    snapTo(axis, sign) {
      const s = read();
      let toTheta: number;
      let toPhi: number;
      if (axis === 'y') {
        // Top and bottom are azimuth-degenerate; hold the current spin so the
        // model doesn't swing sideways on the way over the pole.
        toTheta = s.theta;
        toPhi = sign > 0 ? EPS : Math.PI - EPS;
      } else {
        toPhi = Math.PI / 2;
        toTheta = axis === 'z'
          ? (sign > 0 ? 0 : Math.PI)
          : (sign > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
      anim = {
        t0: performance.now(),
        fromTheta: s.theta,
        fromPhi: s.phi,
        toTheta: s.theta + shortestDelta(s.theta, toTheta),
        toPhi,
      };
    },

    update() {
      if (!anim) return;
      const k = Math.min(1, (performance.now() - anim.t0) / SNAP_MS);
      const e = easeInOutCubic(k);
      const s = read();   // radius re-read each frame, so a mid-snap zoom holds
      s.theta = anim.fromTheta + (anim.toTheta - anim.fromTheta) * e;
      s.phi = anim.fromPhi + (anim.toPhi - anim.fromPhi) * e;
      write(s);
      if (k >= 1) anim = null;
    },
  };
}
