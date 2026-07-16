# Motion Studio

An **open-source factory for quick videos and GIFs**. Drag in images, pick a
motion template, tweak live controls, preview in real time, and export MP4/GIF
via native ffmpeg. Runs self-hosted on localhost — single machine, no auth.

![UI](ui.png)

## Stack

- **Next.js** (App Router, TypeScript)
- **PixiJS v8** — sprites are image layers, filters are effects (GPU)
- **Zustand** — single live state, read every frame by the Pixi ticker
- **native ffmpeg** — deterministic frame-stepped export (`/api/export`)

## Run

```bash
npm install
npm run dev          # → http://localhost:3000
brew install ffmpeg  # required only for MP4/GIF export
```

## Architecture

```
Layers (assets → Pixi sprites, slots in order)
  → Motion   templates/*.ts  transform(frame, i, count, values, ctx)  ← SEAM 1
  → Composite (depth-sorted stage)
  → Effects  effects/*.ts    ordered Pixi filter stack                ← SEAM 2
  → getFrameState(frame) — ONE clock for live preview AND export
```

Principles: one live state read every frame · templates fully self-declare
their controls · full value reset on template switch · fixed 8-type control
vocabulary · shared `cardPath` helper (line / arc / ring / zwall) · every
template ships a default easing curve (`lib/easing.ts`).

## Motion templates

25 families in `templates/` — Carousel, Orbit, Stack, 3D, Wheel, Field, Wipe,
Stories, Spin, Flicker, Globe, Carousel 3D, Grid, Spiral, Tour, Magazine,
Gravity, Parallax, Deck, Flip, Marquee, Scale, Proximity, Frames, and a Blank
canvas. Each family is one file; variants are preset bundles over the same pure
transform (`templates/variant.ts`).

**Adding a motion** = one file: declare controls, compute `phase` (route it
through `ctx.easedPhase` to inherit the scene's easing curve), map controls onto
scale/alpha/rotation/depth, register in `templates/index.ts`. The control panel,
easing block, thumbnail, and export pick it up automatically. Same for effects
(`effects/`).

**Seamless loops.** Every template quantizes its speed to a whole number of
motif cycles per clip via `loopCycles()` (`lib/motion.ts`), so frame 0 ≡ frame
`totalFrames` and exported MP4/GIF loops never pop. Conveyor templates use
`period = count` so textures land back on their own slots. Templates that are
one-shot by design (Gravity) simply skip the helper. `meta.repeatAssets` lets
high-count fields (Proximity, Marquee, Frames, Field, Scatter, Zoom) cycle a
small image set across hundreds of layers.

**Deliberately not implemented** (from the reference-tool analysis): per-lane
offset sliders (a single lane-offset control covers it), a global `delay` param
(in a perfect loop it is just a phase rotation), and `count=0` auto-fill
(conflicts with the slot model; `repeatAssets` covers the intent).

## Easing

Every template carries a cubic-bezier easing curve editable in the Easing block
(`components/EasingPanel.tsx`). The preset library (`lib/easing.ts`) covers the
signature curves (Flow, Glide, Linear, Ease, Sweep, Smooth, Flip), the standard
Sine/Quad/Cubic/Quart/Expo families, physics curves (Bounce, Spring, Wiggle,
Overshoot), and hand-dragged custom beziers. The renderer resolves the curve
once per frame and reshapes each motion's cyclic phase while keeping loops
seamless.

## Design system

Neutral-grey token set (`styles/tokens.css`): `#171717` cards (r14) on
`#0d0d0d`, `#232323` tracks, `#2d2d2d` thumbs, 13px/#ccc labels, 10px/1.5px
eyebrows, value-inside-track sliders, dashed-ruler timeline with a playhead
chip. Light theme via `:root[data-theme="light"]`.

## Collaborators

Thanks to [@quefreen](https://github.com/quefreen) and
[@milkatx](https://github.com/milkatx) for the help, support, and quick repo
edits.
