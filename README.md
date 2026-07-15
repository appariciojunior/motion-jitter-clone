# motion-jitter-clone

Self-hosted 2D motion-graphics tool on localhost. Drag in images, pick a motion
template, tweak live controls, preview in real time, export MP4/GIF via native
ffmpeg. Personal use, single machine, no auth.

![UI](design-audit.png)

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
vocabulary · shared `cardPath` helper (line / arc / ring / zwall).

## Templates (189 across 25 families)

Carousel, Orbit, Stack, 3D, Wheel, Field, Wipe, Stories, Spin, Flicker,
Globe, Carousel 3D, Grid, Spiral, Tour, Magazine, Gravity, Parallax, Deck,
Flip, Marquee, Scale, Proximity, Frames, and Blank. The verified preset values
and per-preset control schemas live in `templates/catalog.generated.json`; the
family motion implementations live in `templates/catalog.ts`.

Scene timing includes cycles, duration, delay, and all 27 built-in cubic-bezier
easing presets, with editable handles for custom curves.

**Adding a motion** = add its preset/schema data, provide a family transform in
`templates/catalog.ts`, and register the family mapping there. The control
panel, thumbnail, live preview, and export pick it up automatically. Effects
remain self-contained in `effects/`.

## Design system

Tokens extracted from the Figma reference (`styles/tokens.css`): `#171717`
cards (r14) on `#0d0d0d`, `#232323` tracks, `#2d2d2d` thumbs, 13px/#ccc labels,
10px/1.5px eyebrows, value-inside-track sliders, dashed-ruler timeline with a
playhead chip. `design-audit.png` is a 2× full-quality capture for auditing
typography and spacing.
