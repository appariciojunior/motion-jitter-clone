'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CameraRig, AxisKey, AxisSign } from '@/three3d/cameraRig';

// ── Blender-style view gizmo ────────────────────────────────────────────────
// Six axis balls showing how the camera sits relative to the world axes. Drag
// to orbit; double-click a ball to snap to that axis view.
//
// Two layers, deliberately:
//  • the balls are visual only (pointer-events: none). SVG has no z-index, so
//    painting them far-to-near means reordering DOM nodes every frame — and a
//    node re-inserted between mousedown and mouseup never produces a click.
//  • one fixed rect owns all input and hit-tests the balls by distance, so
//    click/dblclick survive however the balls churn.
// Everything is driven from a rAF, so nothing here may cause a React render:
// hover lives in a ref.

const SIZE = 78;          // widget box
const C = SIZE / 2;       // centre
const R = 25;             // axis length
const BALL = 8.2;         // ball radius at full scale
const HIT = 12;           // pick radius around a ball
const DRAG_SLOP = 3;      // px before a press counts as a drag
const DEPTH_BIAS = 6;     // px-equivalent bonus for the ball nearest the camera

interface Axis { key: AxisKey; sign: AxisSign; label: string; cls: string; }

const AXES: Axis[] = [
  { key: 'x', sign: 1, label: 'X', cls: 'gz-x' },
  { key: 'x', sign: -1, label: 'X', cls: 'gz-x' },
  { key: 'y', sign: 1, label: 'Y', cls: 'gz-y' },
  { key: 'y', sign: -1, label: 'Y', cls: 'gz-y' },
  { key: 'z', sign: 1, label: 'Z', cls: 'gz-z' },
  { key: 'z', sign: -1, label: 'Z', cls: 'gz-z' },
];

export default function ViewGizmo({ rig }: { rig: CameraRig }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<SVGGElement>(null);
  const groups = useRef<(SVGGElement | null)[]>([]);
  const circles = useRef<(SVGCircleElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);
  const labels = useRef<(SVGTextElement | null)[]>([]);
  // live projection of each axis, shared between the draw tick and hit-testing
  const proj = useRef(AXES.map(() => ({ x: C, y: C, z: 0 })));
  const hover = useRef<number | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const order: number[] = [];
    let lastKey = '';
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const root = rootRef.current;
      if (!root) return;

      // World axes as the camera sees them: undo the camera's rotation. In view
      // space the camera looks down -Z, so z > 0 means the ball faces us.
      rig.getQuaternion(q).invert();
      for (let i = 0; i < AXES.length; i++) {
        const a = AXES[i];
        v.set(0, 0, 0);
        v[a.key] = a.sign;
        v.applyQuaternion(q);
        const p = proj.current[i];
        p.x = C + v.x * R;
        p.y = C - v.y * R;
        p.z = v.z;
      }

      order.length = 0;
      for (let i = 0; i < AXES.length; i++) order.push(i);
      order.sort((m, n) => proj.current[m].z - proj.current[n].z);   // far first

      // Only touch the DOM when the depth order actually flips — re-seating
      // nodes is what breaks synthesised clicks, so do it as rarely as we can.
      const key = order.join(',');
      if (key !== lastKey) {
        lastKey = key;
        for (const i of order) {
          const g = groups.current[i];
          if (g) root.appendChild(g);
        }
      }

      for (let i = 0; i < AXES.length; i++) {
        const a = AXES[i];
        const p = proj.current[i];
        const g = groups.current[i];
        const circle = circles.current[i];
        if (!g || !circle) continue;

        const near = (p.z + 1) / 2;               // 0 = behind, 1 = in front
        const on = hover.current === i;
        circle.setAttribute('cx', String(p.x));
        circle.setAttribute('cy', String(p.y));
        circle.setAttribute('r', String(BALL * (0.8 + 0.2 * near) * (on ? 1.25 : 1)));
        g.setAttribute('opacity', String(on ? 1 : 0.5 + 0.5 * near));

        const line = lines.current[i];
        if (line) { line.setAttribute('x2', String(p.x)); line.setAttribute('y2', String(p.y)); }

        const label = labels.current[i];
        if (label) {
          label.setAttribute('x', String(p.x));
          label.setAttribute('y', String(p.y + 0.5));
          // negatives stay bare until pointed at, as in Blender
          label.setAttribute('opacity', a.sign > 0 || on ? '1' : '0');
        }
      }

      const svg = svgRef.current;
      if (svg && !dragging.current) svg.style.cursor = hover.current === null ? 'grab' : 'pointer';
    };

    tick();
    return () => cancelAnimationFrame(raf);
  }, [rig]);

  // Nearest ball under the pointer; the one facing the camera wins an overlap.
  const pick = (clientX: number, clientY: number): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const px = clientX - r.left;
    const py = clientY - r.top;
    let best: number | null = null;
    let bestScore = Infinity;
    for (let i = 0; i < AXES.length; i++) {
      const p = proj.current[i];
      const d = Math.hypot(px - p.x, py - p.y);
      if (d > HIT) continue;
      const score = d - p.z * DEPTH_BIAS;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  };

  // Press-and-drag orbits. Move/up live on the window so a drag that leaves the
  // widget keeps tracking. No preventDefault() on pointerdown: it would suppress
  // the compatibility mouse events and swallow the dblclick that snaps.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    let last = { x: e.clientX, y: e.clientY };

    const move = (ev: PointerEvent) => {
      if (!dragging.current && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > DRAG_SLOP) {
        dragging.current = true;
        if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
      }
      if (!dragging.current) return;
      rig.orbit(ev.clientX - last.x, ev.clientY - last.y);
      last = { x: ev.clientX, y: ev.clientY };
    };
    const up = () => {
      dragging.current = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <svg
      ref={svgRef}
      className="view-gizmo"
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label="View orientation — drag to orbit, double-click an axis to snap to it"
    >
      <g ref={rootRef}>
        {AXES.map((a, i) => (
          <g
            key={`${a.key}${a.sign}`}
            ref={(el) => { groups.current[i] = el; }}
            className={`gz-axis ${a.cls} ${a.sign > 0 ? 'gz-pos' : 'gz-neg'}`}
          >
            {a.sign > 0 && <line ref={(el) => { lines.current[i] = el; }} x1={C} y1={C} x2={C} y2={C} />}
            <circle className="gz-ball" ref={(el) => { circles.current[i] = el; }} cx={C} cy={C} r={BALL} />
            <text ref={(el) => { labels.current[i] = el; }} x={C} y={C}>{a.label}</text>
          </g>
        ))}
      </g>

      {/* fixed input target — never re-seated, so clicks always land */}
      <rect
        className="gz-input"
        x={0}
        y={0}
        width={SIZE}
        height={SIZE}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => { if (!dragging.current) hover.current = pick(e.clientX, e.clientY); }}
        onPointerLeave={() => { hover.current = null; }}
        onDoubleClick={(e) => {
          const i = pick(e.clientX, e.clientY);
          if (i !== null) rig.snapTo(AXES[i].key, AXES[i].sign);
        }}
      />
    </svg>
  );
}
