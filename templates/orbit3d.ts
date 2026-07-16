import type { Template } from '@/lib/types';
import { TAU, lerp, loopCycles } from '@/lib/motion';
import { cardPath } from '@/lib/cardPath';
import { variant } from './variant';

const BASE = 340;

// Orbit 3D — real WebGL orbit: cards ride a circle in actual 3D space, seen
// through a perspective camera (the `perspective` control maps to camera FOV
// in the 3D renderer). `facing` chooses billboarded cards (screen) or cards
// lying on the ring like a carousel drum (ring). The 2D transform below is a
// cheap projection of the same motion for thumbnails.
const orbit3d: Template = {
  meta: {
    id: 'orbit-3d-01', name: 'Orbit 3D 01', group: 'Orbit',
    defaultEasing: { id: 'flow' }, engine: 'webgl',
  },

  controls: [
    { key: 'direction',   label: 'Direction',   type: 'toggle', options: ['forward','reverse'], default: 'forward' },
    { key: 'count',       label: 'Count',       type: 'slider', min: 2, max: 16, step: 1,   default: 8 },
    { key: 'cardSize',    label: 'Plane Size',  type: 'slider', min: 50, max: 800, step: 1, default: 300 },
    { key: 'radius',      label: 'Orbit Radius',type: 'slider', min: 100, max: 700, step: 1, default: 380 },
    { key: 'perspective', label: 'Perspective', type: 'slider', min: 0, max: 200, step: 1,  default: 120 },
    { key: 'tiltX',       label: 'Tilt',        type: 'slider', min: -45, max: 45, step: 1, default: 10 },
    { key: 'facing',      label: 'Facing',      type: 'pills', options: ['screen','ring'],  default: 'screen' },
    { key: 'fade',        label: 'Depth Fade',  type: 'slider', min: 0, max: 100, step: 1,  default: 25 },
    { key: 'speed',       label: 'Speed',       type: 'slider', min: 0, max: 2, step: 0.1,  default: 0.3 },
    { key: 'offset',      label: 'Offset',      type: 'xypad',                              default: { x: 0, y: 0 } },
  ],

  // Real 3D pose (renderer3d). y is canvas-down; the renderer flips it.
  transform3d: (frame, index, count, v, ctx) => {
    const dir = v.direction === 'reverse' ? -1 : 1;
    const phase = ctx.easedPhase((frame / ctx.totalFrames) * loopCycles(v.speed, ctx.duration, count) * dir);
    const a = TAU * ((index - phase) / count);

    // ring in the XZ plane, tilted around the X axis
    const tilt = (v.tiltX * Math.PI) / 180;
    const x0 = Math.sin(a) * v.radius;
    const z0 = Math.cos(a) * v.radius;
    const y = -z0 * Math.sin(tilt) + v.offset.y; // tilt lifts the far side
    const z = z0 * Math.cos(tilt);

    const depthN = (z0 / v.radius + 1) / 2; // 1 = front, 0 = back
    const alpha = 1 - (v.fade / 100) * (1 - depthN);

    return {
      x: x0 + v.offset.x,
      y,
      z,
      rotationX: v.facing === 'ring' ? tilt : 0,
      rotationY: v.facing === 'ring' ? a : 0,
      rotationZ: 0,
      scale: v.cardSize / BASE,
      alpha,
    };
  },

  // 2D projection of the same orbit (thumbnails + non-webgl fallback).
  transform: (frame, index, count, v, ctx) => {
    const dir = v.direction === 'reverse' ? -1 : 1;
    const phase = ctx.easedPhase((frame / ctx.totalFrames) * loopCycles(v.speed, ctx.duration, count) * dir);
    const p = cardPath({ kind: 'ring', index, count, phase, radius: v.radius });
    const tiltSquash = Math.abs(Math.sin((v.tiltX * Math.PI) / 180)) * 0.8 + 0.1;
    const scale = (v.cardSize / BASE) * lerp(0.55, 1.1, p.depthNorm);
    return {
      x: p.x + v.offset.x,
      y: -p.y * tiltSquash + v.offset.y,
      scale,
      rotation: 0,
      alpha: 1 - (v.fade / 100) * (1 - p.depthNorm),
      depth: p.depthNorm,
    };
  },
};

export const orbit3dVariants: Template[] = [
  orbit3d,
  variant(orbit3d, 'orbit-3d-02', 'Orbit 3D 02', {
    facing: 'ring', count: 10, radius: 460, tiltX: 0, perspective: 160, speed: 0.25,
  }),
  variant(orbit3d, 'orbit-3d-03', 'Orbit 3D 03', {
    count: 6, radius: 300, tiltX: 28, perspective: 80, cardSize: 380, fade: 45,
  }),
];
