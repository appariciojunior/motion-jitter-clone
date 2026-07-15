# Add fade-through transitions between export phases

- Status: DONE
- Implementation: current working tree (uncommitted by request)
- Priority: MEDIUM
- Category: State continuity / missed opportunity
- Baseline commit: `a0cd5fd`
- Depends on: none; compatible with `003-symmetric-export-modal-dismissal.md`

## Context and evidence

`components/ExportDialog.tsx` swaps five mutually exclusive views directly:

```tsx
{phase === 'idle' && <button className="btn primary full" onClick={run}>Start export</button>}
{phase === 'capturing' && <div className="progress">…</div>}
{phase === 'encoding' && <div className="progress">…</div>}
{phase === 'done' && <div className="export-done">…</div>}
{phase === 'error' && <div className="export-error">…</div>}
```

Capturing can last seconds, so the phase changes are infrequent and meaningful. The instant swap makes progress appear to blink between shapes.

## Goal

Use a short fade-through when the export phase changes. Keep progress-number updates inside the capturing phase immediate; only changes to the `Phase` enum trigger choreography.

## Exact motion specification

- Old phase exit: opacity `1 → 0`, translateY `0 → -2px`, `100ms`, `var(--ease-standard)`.
- New phase enter: opacity `0 → 1`, translateY `2px → 0`, `150ms`, `var(--ease-out)`.
- Sequence: exit first, then replace content and enter. This deliberate fade-through avoids overlapping content of different heights.
- Container height may update when content is replaced; do not animate height.
- Under reduced motion, update the displayed phase synchronously with no delay or transform.
- Captured frame count and progress bar width must continue updating without replaying the phase animation.

## Files to change

- Edit `components/ExportDialog.tsx`.
- Edit `app/globals.css`.
- No new dependency and no store changes.

## Implementation steps

1. Keep `phase` as the semantic process state. Add:

   - `visualPhase`, initialized to `'idle'`;
   - `phaseMotion`, typed as `'idle' | 'exiting' | 'entering'`;
   - a timer ref with unmount cleanup.

2. Create `transitionTo(next: Phase)` and use it everywhere that currently calls `setPhase`:

   - set the semantic `phase` to `next` immediately;
   - in reduced motion, clear any timer, set `visualPhase(next)`, and set `phaseMotion('idle')`;
   - otherwise set `phaseMotion('exiting')` and schedule a 100ms callback;
   - in that callback, set `visualPhase(next)`, set `phaseMotion('entering')`, and schedule a second 150ms callback that returns `phaseMotion` to `'idle'`;
   - if another phase arrives during either timer, clear the prior timer and restart from the currently displayed content. The newest phase always wins.

3. Render the conditional content from `visualPhase`, not `phase`. Wrap all five branches in one stable element:

   ```tsx
   <div className={`export-phase ${phaseMotion}`} data-phase={visualPhase}>
     {/* existing visualPhase branches, unchanged internally */}
   </div>
   ```

4. Keep operational logic keyed to the semantic phase where needed. Do not delay network requests, frame capture, encoding, error handling, or restoration of playback.

5. Add styles:

   ```css
   .export-phase.exiting {
     animation: export-phase-out var(--motion-instant) var(--ease-standard) both;
     pointer-events: none;
   }

   .export-phase.entering {
     animation: export-phase-in var(--motion-fast) var(--ease-out) both;
   }

   @keyframes export-phase-out {
     from { opacity: 1; transform: translateY(0); }
     to { opacity: 0; transform: translateY(-2px); }
   }

   @keyframes export-phase-in {
     from { opacity: 0; transform: translateY(2px); }
     to { opacity: 1; transform: translateY(0); }
   }
   ```

6. Add a reduced-motion override that sets `.export-phase` transform to `none`.

## Scope boundaries

- Do not crossfade every `captured` counter update.
- Do not animate the progress bar differently; its existing 100ms linear width transition is correct for streamed progress.
- Do not animate modal size.
- Do not delay the semantic phase or the export task itself.
- Do not add blur, spring, scale, or stagger.

## Acceptance criteria

- `idle → capturing → encoding → done` uses the exact 100ms-out/150ms-in sequence.
- Renderer-not-ready and thrown-request errors use the same transition into `error`.
- Frame count changes do not replay animations.
- A rapid phase change cannot reveal stale intermediate content after a newer phase.
- Reduced-motion mode changes content synchronously.

## Verification and feel-check

1. Exercise the successful export path and record at 0.25×.
2. Force the renderer-not-ready error and a server/ffmpeg error; verify both enter cleanly.
3. Watch the capturing counter for at least 20 frame updates and confirm it does not blink.
4. Inspect timers with React Strict Mode behavior; unmounting the modal mid-transition must not log a state-update warning.
5. Confirm semantic export work is not delayed by 100ms or 150ms; only displayed content is delayed.
