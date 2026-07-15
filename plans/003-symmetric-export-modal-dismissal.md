# Add symmetric export modal dismissal

- Status: DONE
- Implementation: current working tree (uncommitted by request)
- Priority: MEDIUM
- Category: Easing / duration / interruptibility
- Baseline commit: `a0cd5fd`
- Depends on: none

## Context and evidence

The export modal has a polished entrance but unmounts immediately on backdrop or close-button click:

```tsx
// components/Timeline.tsx
{showExport && <ExportDialog onClose={() => setShowExport(false)} />}
```

```css
.modal-backdrop {
  animation: modal-backdrop-in var(--motion-fast) var(--ease-out) both;
}
.modal {
  animation: modal-in var(--motion-control) var(--ease-soft) both;
}
```

The missing exit makes dismissal feel like a dropped frame.

## Goal

Keep the dialog mounted for a 150ms exit, regardless of whether dismissal comes from the close button or backdrop. All repeated close requests during that interval must collapse into one `onClose` call.

## Exact motion specification

- Backdrop exit: opacity `1 → 0`, `150ms`, `var(--ease-standard)` (`cubic-bezier(.4, 0, .2, 1)`).
- Dialog exit: opacity `1 → 0`, translateY `0 → 4px`, scale `1 → .99`, `150ms`, `var(--ease-standard)`.
- Pointer events are disabled on the entire backdrop as soon as exit begins.
- Reduced motion: complete dismissal immediately; do not wait 150ms.
- Preserve the current entrance exactly: backdrop 150ms ease-out; dialog 200ms ease-soft from translateY 8px / scale .985.

## Files to change

- Edit `components/ExportDialog.tsx`.
- Edit `app/globals.css`.
- Do not change ownership of `showExport` in `components/Timeline.tsx`.

## Implementation steps

1. In `ExportDialog.tsx`, add `closing` state and a timer ref.

2. Replace direct uses of the prop callback with a local `requestClose` function:

   - if `closing` is already true, return;
   - if `matchMedia('(prefers-reduced-motion: reduce)').matches`, call `onClose()` immediately;
   - otherwise set `closing` to true and schedule exactly one `onClose()` call after 150ms;
   - clear the timer in an unmount cleanup.

3. Change the backdrop to `className={\`modal-backdrop ${closing ? 'closing' : ''}\`}` and route both the backdrop click and close button through `requestClose`.

4. Keep `e.stopPropagation()` on the modal. Add `aria-disabled={closing}` to the close button and prevent any new modal actions by relying on `pointer-events: none` on the closing backdrop.

5. Add these styles and keyframes:

   ```css
   .modal-backdrop.closing {
     pointer-events: none;
     animation: modal-backdrop-out var(--motion-fast) var(--ease-standard) both;
   }

   .modal-backdrop.closing .modal {
     animation: modal-out var(--motion-fast) var(--ease-standard) both;
   }

   @keyframes modal-backdrop-out {
     from { opacity: 1; }
     to { opacity: 0; }
   }

   @keyframes modal-out {
     from { opacity: 1; transform: translateY(0) scale(1); }
     to { opacity: 0; transform: translateY(4px) scale(.99); }
   }
   ```

6. In the existing reduced-motion media query, ensure `.modal-backdrop.closing .modal` has `transform: none`. The immediate JavaScript branch is the authoritative removal path.

## Scope boundaries

- Do not add a motion library.
- Do not redesign export contents or phase transitions; those belong to plan 004.
- Do not change export cancellation semantics or background export behavior.
- Do not add focus trapping in this motion-only plan.

## Acceptance criteria

- Close button and backdrop dismissal use the same exit.
- Rapid backdrop/close clicks call `onClose` once.
- The dialog remains visible for the full 150ms exit and then unmounts.
- No click can reach controls behind the backdrop during the exit.
- Reduced-motion dismissal is immediate and has no transform.

## Verification and feel-check

1. Open and close the dialog ten times using alternating close-button and backdrop clicks.
2. Double-click the close button and verify no React warnings or duplicate state updates.
3. Record at 0.25×. The exit should be shorter and quieter than the entrance, moving only 4px.
4. Toggle reduced motion and verify the modal disappears immediately.
5. Confirm the export process still starts, progresses, completes, and can be dismissed.
