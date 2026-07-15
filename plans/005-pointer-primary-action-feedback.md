# Add pointer-only feedback to primary actions

- Status: DONE
- Implementation: current working tree (uncommitted by request)
- Priority: LOW
- Category: Purpose / frequency / accessibility
- Baseline commit: `a0cd5fd`
- Depends on: none

## Context and evidence

High-value buttons currently have hover color or opacity changes but no physical pointer-down acknowledgement:

```css
.play-btn { transition: background var(--t-fast); }
.export-btn { transition: opacity var(--t-fast); }
.btn { /* background/color treatment; no press transform */ }
```

The editor is compact and precise, so the feedback should be nearly imperceptible. Keyboard activation must not move controls.

## Goal

Add a 1px / 0.99-scale press response to the four primary action families while preserving focus-visible behavior, reduced motion, and immediate action dispatch.

## Exact motion specification

- Targets: `.btn`, `.play-btn`, `.export-btn`, `.stage-fs` only.
- Pointer-down state: `translateY(1px) scale(.99)`.
- Press-in transition: `100ms`, `var(--ease-out)`.
- Release transition: `150ms`, `var(--ease-out)`.
- Apply only inside `@media (hover: hover) and (pointer: fine)` and only to `:active:not(:focus-visible)`.
- Under reduced motion, transform must remain `none`.
- Do not affect tabs, pills, icon-only row controls, drag grips, sliders, scrubbers, form fields, or keyboard-focused buttons.

## Files to change

- Edit `app/globals.css` only.

## Implementation steps

1. Extend the base transitions of the four target selectors to include:

   ```css
   transform var(--motion-fast) var(--ease-out)
   ```

   Keep every existing background, color, and opacity transition.

2. Add the fine-pointer rule after the target definitions:

   ```css
   @media (hover: hover) and (pointer: fine) {
     .btn:active:not(:focus-visible),
     .play-btn:active:not(:focus-visible),
     .export-btn:active:not(:focus-visible),
     .stage-fs:active:not(:focus-visible) {
       transform: translateY(1px) scale(.99);
       transition-duration: var(--motion-instant);
     }
   }
   ```

3. In the existing `@media (prefers-reduced-motion: reduce)` block, add the same selector group with `transform: none !important`.

4. Do not add JavaScript pointer state. CSS should remain interruptible automatically when the pointer leaves or the press is canceled.

## Acceptance criteria

- Mouse/trackpad press on Add, Start export, Play, Export, and fullscreen gives the same restrained feedback.
- Releasing inside or outside returns the button to rest without sticking.
- Tab + Space/Enter activation does not translate a focus-visible button.
- Touch/coarse-pointer devices do not receive the transform.
- Reduced-motion mode does not translate.
- Focus outlines remain unchanged.

## Verification and feel-check

1. Test mouse down, drag outside, and mouse up for each target family.
2. Navigate with Tab and activate using Space and Enter; verify the focus ring stays stable and the element does not move.
3. Emulate a coarse pointer and reduced motion in DevTools.
4. Record at normal speed. If the scale is consciously noticeable rather than merely tactile, reduce only the scale to `.995`; do not increase movement or duration.
5. Confirm controls dispatch on the original event timing; no click handler should change.
