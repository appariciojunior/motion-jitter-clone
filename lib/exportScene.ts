// ============================================================
//  SCENE EXPORT — the drop-in bundle (zip)
//  Ships the REAL editor modules (decoupled from the stores) plus a props-driven
//  React driver, so the user can drop `scene/` into their site and keep editing
//  locally. Works for ANY effect — every motion template is pure frame→pose, so
//  the whole templates/ folder is included and picked by id.
//
//  (A standalone HTML preview is intentionally left out for now — the pack is
//  meant to be imported into a real project. A general preview can be added
//  later.)
// ============================================================

import JSZip from 'jszip';
import { buildBoardProject, type BoardProject } from './boardProject';
import { SCENE_SOURCES, TEMPLATE_MANIFEST } from './exportSources';

// Core modules always shipped (small, pure). Template files are added on demand.
const CORE_FILES = ['types.ts', 'easing.ts', 'motion.ts', 'boardPose.ts', 'boardCompose.ts', 'sceneEngine.ts'];

// Which template FILE provides an id — exact match first (ids like stories-03
// live in storiesFocus.ts, so prefix alone is ambiguous), then a family
// fallback for ids assembled elsewhere (e.g. carousel-03 → carousel.ts).
function fileForId(id: string): string | null {
  const exact = Object.keys(TEMPLATE_MANIFEST).find((f) => TEMPLATE_MANIFEST[f].ids.includes(id));
  if (exact) return exact;
  const fam = id.replace(/-\d+$/, '');
  return Object.keys(TEMPLATE_MANIFEST).find((f) =>
    TEMPLATE_MANIFEST[f].ids.some((x) => x === fam || x.replace(/-\d+$/, '') === fam)) ?? null;
}

// A minimal registry over only the included template files.
function registryTs(tmplFiles: string[]): string {
  const imports: string[] = [];
  const names: string[] = [];
  for (const f of tmplFiles) {
    const exps = TEMPLATE_MANIFEST[f].exports;
    imports.push(`import { ${exps.join(', ')} } from './${f.replace('.ts', '')}';`);
    names.push(...exps);
  }
  return `import type { Template } from './types';
${imports.join('\n')}

// Every export is a Template or a Template[]; concat flattens both.
const ALL: Template[] = ([] as Template[]).concat(${names.join(', ')});

export function getTemplate(id: string): Template {
  return ALL.find((t) => t.meta.id === id) ?? { ...ALL[0], meta: { ...ALL[0].meta, id } };
}
`;
}

// Card / frame look — styles.css imported by MotionExport.
const STYLES = `.bs-frame{position:absolute;left:50%;top:50%;transform-origin:center center;overflow:hidden;border-radius:14px;background:#171a21;box-shadow:0 10px 40px rgba(0,0,0,.45)}
.bs-card{position:absolute;width:200px;height:260px;border-radius:12px;background:#e9edf4;border:1px solid #cfd6e2;box-shadow:0 6px 20px rgba(0,0,0,.18);backface-visibility:hidden;will-change:transform,opacity}
.bs-num{position:absolute;top:8px;left:50%;transform:translateX(-50%);font:600 13px system-ui,sans-serif;color:#5a6473}
.bs-hot{position:absolute;top:0;left:50%;transform:translateX(-50%);width:56px;height:56px;border-radius:8px;pointer-events:auto;cursor:pointer}
`;

// The real, props-driven React driver — decoupled from the editor stores. It
// runs the same pure modules the editor uses, so it's WYSIWYG. Handles both the
// card-scope "book" interaction and plain board-scope playback, any template.
const BOOKSCENE_JSX = `'use client';
import { useEffect, useRef } from 'react';
import { createCollectionScene, createLiftScene } from './sceneEngine';
import { composedPoseLayers, applyCardPose } from './boardCompose';
import { resolveEasing } from './easing';
import { getTemplate } from './registry';
import { CONFIG } from './config';
import './styles.css';

export default function MotionExport({ config = CONFIG, style = undefined }) {
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const hoveredIdxRef = useRef(-1);
  const pointerRef = useRef({ x: 0, y: 0, on: false });

  useEffect(() => {
    const bc = config.board, sc = config.scene, board = bc.board;
    const N = bc.count, FPS = 60;
    const FRAME_W = bc.frameW || 1440, FRAME_H = bc.frameH || 720;
    const cardScope = !!(bc.motionOn && bc.hoverPlay && bc.hoverScope === 'card');
    const stage = stageRef.current, frame = frameRef.current;
    if (!stage || !frame) return;

    frame.style.width = FRAME_W + 'px';
    frame.style.height = FRAME_H + 'px';
    frame.innerHTML = '';
    const els = [];
    for (let i = 0; i < N; i++) {
      const c = document.createElement('div'); c.className = 'bs-card';
      const num = document.createElement('span'); num.className = 'bs-num';
      num.textContent = (i + 1 < 10 ? '0' : '') + (i + 1); c.appendChild(num);
      const h = document.createElement('span'); h.className = 'bs-hot';
      ((idx) => {
        h.addEventListener('mouseenter', () => { hoveredIdxRef.current = idx; });
        h.addEventListener('mouseleave', () => { if (hoveredIdxRef.current === idx) hoveredIdxRef.current = -1; });
      })(i);
      c.appendChild(h); frame.appendChild(c); els.push(c);
    }

    const fit = () => {
      const k = Math.min(stage.clientWidth / FRAME_W, stage.clientHeight / FRAME_H, 1);
      frame.style.transform = 'translate(-50%, -50%) scale(' + k + ')';
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(stage);
    let hovered = false;
    const onEnter = () => { hovered = true; };
    const onMove = (e) => { pointerRef.current.x = e.clientX; pointerRef.current.y = e.clientY; pointerRef.current.on = true; };
    const onLeave = () => { pointerRef.current.on = false; hoveredIdxRef.current = -1; hovered = false; };
    stage.addEventListener('mouseenter', onEnter);
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', onLeave);

    const collection = createCollectionScene();
    const lift = createLiftScene();
    const template = getTemplate(sc.activeTemplateId);
    const liftTpl = getTemplate('stack-01');
    const values = Object.assign({}, sc.values, { count: N });
    const liftValues = { direction: 'up', visible: 3, cardSize: values.cardSize || 200, zoom: 100, perspective: 0, stagger: values.stagger || 0.14, speed: values.speed || 0.5, offset: { x: 0, y: 0 } };
    const ease = resolveEasing(sc.easing);
    const DURATION = sc.duration || 8;
    const TOTAL = Math.max(1, Math.round(DURATION * FPS));
    const MARGIN = 64;
    let box = null, lastBox = 0, lastNow = 0, clock = 0, raf = 0;

    const loop = (now) => {
      const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0; lastNow = now;
      const ctx = { fps: FPS, width: frame.clientWidth, height: frame.clientHeight, duration: DURATION, totalFrames: TOTAL, ease, easedPhase: (p) => { const b = Math.floor(p); return b + ease(p - b); } };
      let motion = null, liftMotion = null, frameN = 0;

      if (cardScope) {
        if (now - lastBox > 100) {
          lastBox = now; let l = Infinity, t = Infinity, r = -1e9, b = -1e9;
          for (let i = 0; i < N; i++) { const q = els[i].getBoundingClientRect(); if (q.left < l) l = q.left; if (q.top < t) t = q.top; if (q.right > r) r = q.right; if (q.bottom > b) b = q.bottom; }
          box = r >= l ? { l, t, r, b } : null;
        }
        const p = pointerRef.current;
        const onBoard = p.on && !!box && p.x >= box.l - MARGIN && p.x <= box.r + MARGIN && p.y >= box.t - MARGIN && p.y <= box.b + MARGIN;
        const input = { focus: hoveredIdxRef.current, onBoard, dt };
        motion = collection.update(input, { count: N, radius: Math.max(0, bc.hoverRadius || 0), side: bc.hoverSide || 'both', rampMs: bc.hoverMs || 350, speed: values.speed || 1, duration: DURATION, fps: FPS });
        if (bc.liftOn !== false) liftMotion = lift.update(input, { count: N, rampMs: bc.hoverMs || 350, speed: values.speed || 1, duration: DURATION, fps: FPS });
      } else if (bc.motionOn) {
        // Board-scope playback: play always, or only while hovering the board.
        const rate = bc.hoverPlay ? (hovered ? 1 : 0) : 1;
        clock = (clock + dt * rate) % DURATION;
        frameN = Math.floor(clock * FPS) % TOTAL;
      }

      for (let i = 0; i < N; i++) {
        const layers = [];
        if (motion) {
          const cm = motion.cards[i];
          layers.push({ template, values, frame: cm.frame, motionIndex: cm.slot, motionCount: motion.motionCount, weight: cm.weight, motionSign: motion.motionSign });
          if (liftMotion) { const lm = liftMotion.cards[i]; if (lm.weight > 0) layers.push({ template: liftTpl, values: liftValues, frame: lm.frame, motionIndex: lm.slot, motionCount: liftMotion.motionCount, weight: lm.weight, motionSign: 1 }); }
        } else if (bc.motionOn && !cardScope) {
          layers.push({ template, values, frame: frameN, motionIndex: i, motionCount: N, weight: 1, motionSign: 1 });
        }
        applyCardPose(els[i], composedPoseLayers(board, bc.perCard || {}, i, N, ctx, !!bc.motionOn, layers, cardScope), i);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      stage.removeEventListener('mouseenter', onEnter);
      stage.removeEventListener('mousemove', onMove);
      stage.removeEventListener('mouseleave', onLeave);
    };
  }, [config]);

  return (
    <div ref={stageRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      <div ref={frameRef} className="bs-frame" />
    </div>
  );
}
`;

function readme(project: BoardProject): string {
  const s = project.scene;
  const b = project.board;
  return `# ${s.activeTemplateId} scene — export bundle

Exported from Motion Studio. The \`scene/\` folder is the **real editor source**
(decoupled from the editor's state), so what you drop in is exactly what the
editor renders — for any effect, not just this one.

## Files

| File | What it is |
|---|---|
| \`scene/MotionExport.jsx\` | Props-driven React driver. Runs the modules below. |
| \`scene/registry.ts\` | \`getTemplate(id)\` over just the template(s) this scene uses. |
| \`scene/${s.activeTemplateId.replace(/-\d+$/, '')}.ts\` | The motion template this scene uses. |
| \`scene/*.ts\` | The pure engine (sceneEngine / boardCompose / boardPose / motion / easing / types). |
| \`scene/config.ts\` | This scene's config as a typed \`CONFIG\` const. |
| \`scene/styles.css\` | Card / frame styles. |
| \`config.json\` | The same config as raw JSON. |

## Use in React / Next

Copy \`scene/\` into your app, then:

\`\`\`jsx
import MotionExport from './scene/MotionExport';

export default function Page() {
  return <div style={{ width: '100vw', height: '100vh' }}><MotionExport /></div>;
}
\`\`\`

Override the scene with your own config:

\`\`\`jsx
import MotionExport from './scene/MotionExport';
import { CONFIG } from './scene/config';
<MotionExport config={{ ...CONFIG }} />
\`\`\`

## How it works

Each card's pose is a **compose stack** — the board rest plus the sum of motion
layers, each a pure function:

\`\`\`
finalPose = board(i) ⊕ Σ(layers)
\`\`\`

- **board** — the static arrangement (\`${b.board.arrangement}\`, ${b.count} cards).
- **board-scope** scenes play the active template on a loop (all cards).
- **card-scope** scenes (\`hoverScope: "card"\`) run the mouse-on-point "book"
  interaction: the neighbours on the \`${b.hoverSide}\` side open to reveal the
  focused card, plus an optional Stack-01 lift (\`liftOn\`).

Swap \`scene.activeTemplateId\` in \`config.ts\` to any id in \`scene/index.ts\`.

## Extend it (add a scene layer)

A layer is a pure state machine: \`update(input, cfg) -> { cards, motionCount, motionSign }\`
(see \`scene/sceneEngine.ts\`). Add one, then push its per-card contribution into
the \`layers\` array in \`MotionExport.jsx\`. Layers never read each other — they
compose only by summing.
`;
}

export async function buildSceneZip(project: BoardProject): Promise<Blob> {
  const pretty = JSON.stringify(project, null, 2);
  const bc = project.board;
  const cardScope = !!(bc.motionOn && bc.hoverPlay && bc.hoverScope === 'card');

  // Only the template(s) this scene actually uses: the active one, plus Stack-01
  // when the card-scope lift is on.
  const neededIds = [project.scene.activeTemplateId];
  if (cardScope && bc.liftOn !== false) neededIds.push('stack-01');
  const tmplFiles = Array.from(new Set(
    neededIds.map(fileForId).filter((f): f is string => !!f),
  ));

  // Ship core + only the needed template files (+ their small deps).
  const include = new Set<string>(CORE_FILES);
  for (const f of tmplFiles) include.add(f);
  for (const f of tmplFiles) {
    const src = SCENE_SOURCES[f] || '';
    if (src.includes('./variant')) include.add('variant.ts');
    if (src.includes('./cardPath')) include.add('cardPath.ts');
  }

  const zip = new JSZip();
  for (const name of include) if (SCENE_SOURCES[name]) zip.file('scene/' + name, SCENE_SOURCES[name]);
  zip.file('scene/registry.ts', registryTs(tmplFiles));
  zip.file('scene/MotionExport.jsx', BOOKSCENE_JSX);
  zip.file('scene/config.ts', 'export const CONFIG = ' + pretty + ';\n');
  zip.file('scene/styles.css', STYLES);

  zip.file('config.json', pretty);
  zip.file('README.md', readme(project));
  return zip.generateAsync({ type: 'blob' });
}

// Build the zip from the live scene and trigger a download.
export async function downloadSceneZip(): Promise<void> {
  const project = buildBoardProject();
  const blob = await buildSceneZip(project);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scene-${project.scene.activeTemplateId}-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
