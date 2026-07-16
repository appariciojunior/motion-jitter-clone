import type { Template } from '@/lib/types';
import { TAU, loopCycles } from '@/lib/motion';
import { variant } from './variant';

const BASE = 340;
const DEG = Math.PI / 180;

// Spin — port of Originkit's "Spin Image". Cards ride an ellipse whose major
// axis lies on the canvas TL→BR diagonal; the whole orbit plane is then tipped
// in 3D by the curve controls (Curve X ≈ rotateY, Curve Y ≈ rotateX) and seen
// through a perspective camera one canvas-edge away. Cards stay billboarded —
// always facing the viewer — so the motion projects exactly onto the 2D
// engine: only position, perspective size, and stacking change.
const spin: Template = {
  meta: {
    id: 'orbit-spin-01', name: 'Spin 01', group: 'Orbit',
    defaultEasing: { id: 'linear' }, cardAspect: 1,
  },

  controls: [
    { key: 'direction',    label: 'Direction',     type: 'toggle', options: ['forward','reverse'], default: 'forward' },
    { key: 'count',        label: 'Count',         type: 'slider', min: 2, max: 16, step: 1,   default: 8 },
    { key: 'width',        label: 'Orbit Width',   type: 'slider', min: 10, max: 150, step: 1, default: 70 },
    { key: 'squash',       label: 'Flatten',       type: 'slider', min: 5, max: 100, step: 1,  default: 35 },
    { key: 'xCurve',       label: 'Curve X',       type: 'slider', min: -90, max: 90, step: 1, default: 63 },
    { key: 'yCurve',       label: 'Curve Y',       type: 'slider', min: -90, max: 90, step: 1, default: -47 },
    { key: 'path',         label: 'Path',          type: 'toggle', options: ['curved','straight'], default: 'curved' },
    { key: 'cardSize',     label: 'Plane Size',    type: 'slider', min: 50, max: 800, step: 1, default: 200 },
    { key: 'cornerRadius', label: 'Corner Radius', type: 'slider', min: 0, max: 100, step: 1,  default: 12 },
    { key: 'speed',        label: 'Speed',         type: 'slider', min: 0, max: 4, step: 0.1,  default: 1.2 },
    { key: 'offset',       label: 'Offset',        type: 'xypad',                              default: { x: 0, y: 0 } },
    { key: 'fade',         label: 'Fade',          type: 'slider', min: 0, max: 100, step: 1,  default: 15 },
  ],

  transform: (frame, index, count, v, ctx) => {
    const dir = v.direction === 'reverse' ? -1 : 1;
    const phase = ctx.easedPhase((frame / ctx.totalFrames) * loopCycles(v.speed, ctx.duration, count) * dir);
    const phi = ((index - phase) / count) * TAU;

    // Ellipse in its own plane; major half-axis a as % of canvas width,
    // minor axis squashed, the whole shape rotated onto the TL→BR diagonal.
    const a = Math.max(1, ((v.width / 100) * ctx.width) / 2);
    const b = a * (v.squash / 100);
    const tilt = Math.atan2(ctx.height, ctx.width);
    const ex = Math.cos(phi) * a;
    const ey = Math.sin(phi) * b;
    const x0 = ex * Math.cos(tilt) - ey * Math.sin(tilt);
    const y0 = ex * Math.sin(tilt) + ey * Math.cos(tilt);

    // Tip the orbit plane: rotateY(xCurve) ∘ rotateX(−yCurve), CSS axes
    // (y down, +z toward the viewer). +90 X → left forward; +90 Y → top forward.
    const ax = -v.yCurve * DEG;
    const ay = v.xCurve * DEG;
    const y1 = y0 * Math.cos(ax);
    const z1 = y0 * Math.sin(ax);
    const x2 = x0 * Math.cos(ay) + z1 * Math.sin(ay);
    const z2 = -x0 * Math.sin(ay) + z1 * Math.cos(ay);

    // Perspective camera one long-edge away (source: 1200px on a 1200 frame).
    const d = Math.max(ctx.width, ctx.height);
    const pf = d / Math.max(d - z2, d * 0.05);

    // Curved path sizes by major-axis depth (0.6 back … 1.4 front); straight
    // keeps cards uniform and lets only perspective breathe.
    const dNorm = (Math.cos(phi) + 1) / 2;
    const sf = v.path === 'curved' ? 0.6 + 0.8 * dNorm : 1;

    return {
      x: x2 * pf + v.offset.x,
      y: y1 * pf + v.offset.y,
      scale: (v.cardSize / BASE) * sf * pf,
      rotation: 0,
      alpha: 1 - (v.fade / 100) * (1 - dNorm),
      // Nearer wins; flat (zero-curve) orbits tie-break lower-on-screen in
      // front, matching the source's y-based stacking.
      depth: (z2 / a + 1) / 2 + (y1 / a) * 0.1,
    };
  },
};

export const spinVariants: Template[] = [
  spin, // Spin 01 — the Originkit preview pose (63 / −47)
  variant(spin, 'orbit-spin-02', 'Spin 02', {
    xCurve: 0, yCurve: -70, squash: 60, count: 10, cardSize: 160, speed: 0.8,
  }),
  variant(spin, 'orbit-spin-03', 'Spin 03', {
    xCurve: -80, yCurve: -15, count: 6, cardSize: 300, width: 90, fade: 35,
  }),
];
