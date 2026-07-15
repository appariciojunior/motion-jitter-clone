# Animate asset and effect reordering with FLIP

- Status: DONE
- Implementation: current working tree (uncommitted by request)
- Priority: HIGH
- Category: Physicality / interruptibility / performance
- Baseline commit: `a0cd5fd`
- Depends on: none; execute after plan 001 to minimize merge friction in the same two components

## Context and evidence

Both editor lists mutate their Zustand arrays synchronously on drop:

```tsx
// components/AssetsPanel.tsx
onDrop={() => {
  if (dragIdx !== null && dragIdx !== i) reorderAssets(dragIdx, i);
  setDragIdx(null);
}}
```

```tsx
// components/EffectsPanel.tsx
onDrop={() => {
  if (dragIdx !== null && dragIdx !== i) reorderEffects(dragIdx, i);
  setDragIdx(null);
}}
```

The resulting DOM order is correct, but every row jumps to its new position in one frame. The existing CSS already allows transform animation, and the app has no motion dependency. Use a small Web Animations API FLIP helper rather than installing a library.

## Goal

After a drop, rows already present in the list should visually travel from their pre-drop rectangle to their new rectangle. The Zustand order must change immediately and remain authoritative.

## Exact motion specification

- Technique: FLIP using an explicit pre-mutation `snapshot()` and a post-commit `useLayoutEffect`.
- Animate only `transform` from `translate(dx, dy)` to `translate(0, 0)`.
- Duration: `200ms` (`var(--motion-control)`).
- Easing: `cubic-bezier(.16, 1, .3, 1)` (`var(--ease-soft)`).
- Fill: `both`.
- Reduced motion: skip WAAPI animation entirely.
- Do not animate width, height, top, left, margins, or shadows.
- Do not animate the native drag ghost or continuously track pointer movement.

## Files to change

- Add `lib/useFlipList.ts`.
- Edit `components/AssetsPanel.tsx`.
- Edit `components/EffectsPanel.tsx`.
- No store or CSS changes are required.

## Implementation steps

1. Add this hook contract:

   ```ts
   export function useFlipList<T extends HTMLElement>(
     listRef: React.RefObject<T | null>,
     orderKey: string,
   ): { snapshot: () => void }
   ```

2. Implement `snapshot()` so the drop handler can measure before it mutates Zustand:

   - query descendants with `[data-flip-id]:not(.leaving)`;
   - build a `Map<string, DOMRect>` from `data-flip-id` to the current visual rectangle;
   - save that map in a ref as the FLIP first state;
   - cancel animations previously created by this hook only after measuring. Because `snapshot()` and the synchronous Zustand reorder occur in one event before paint, cancellation cannot produce a painted jump.

3. In a `useLayoutEffect` keyed by `orderKey`:

   - return when there is no saved snapshot; this avoids animating initial mount;
   - measure the same keyed descendants in their committed final layout;
   - compute `dx = previous.left - current.left` and `dy = previous.top - current.top`;
   - if either absolute delta is at least `0.5`, call `element.animate()` with:

     ```ts
     [
       { transform: `translate(${dx}px, ${dy}px)` },
       { transform: 'translate(0, 0)' },
     ]
     ```

     and options `{ duration: 200, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' }`.

   - clear the saved snapshot after scheduling animations.

4. Track animations created by the hook in `Map<string, Animation>`. Cancel only animations stored in this map. Do not call `element.getAnimations()` because that would also cancel row entrance/exit animation from plan 001.

5. Clean the animation map via `animation.onfinish` and `animation.oncancel`. On finish, cancel the animation to remove its `fill: both` effect, then remove it from the map. Guard cleanup with `animations.get(id) === animation`. Do not use `animation.finished.finally(...)`; cancellation rejects the `finished` promise and can produce an unhandled rejection.

6. When reduced motion matches, `snapshot()` should clear prior animations and leave no saved first-state map, so the layout effect never calls `animate()`.

7. In `AssetsPanel.tsx`:

   - add a ref to `.asset-list` and pass it to the hook;
   - use `assets.map((asset) => asset.id).join('|')` as `orderKey`;
   - add `data-flip-id={a.id}` to each `<li>`.
   - call `snapshot()` immediately before `reorderAssets(dragIdx, i)` inside `onDrop`.

8. In `EffectsPanel.tsx`:

   - wrap the mapped cards in `<div className="effect-list" ref={listRef}>`;
   - use `effects.map((effect) => effect.instanceId).join('|')` as `orderKey`;
   - add `data-flip-id={e.instanceId}` to each card.
   - call `snapshot()` immediately before `reorderEffects(dragIdx, i)` inside `onDrop`.

9. Preserve `onDragEnd={() => setDragIdx(null)}` in assets and add the same cleanup to effect cards so a canceled drag cannot leave stale state.

## Acceptance criteria

- Dropping an asset above or below another updates its index immediately and animates all displaced rows into place.
- Effects of different heights travel from their actual previous rectangles without overlap at rest.
- Starting a second reorder before the first 200ms animation ends does not jump or throw an unhandled promise rejection.
- Reduced-motion mode has immediate list order changes and no WAAPI animation.
- The hook never modifies Zustand state and adds no dependency.

## Verification and feel-check

1. Test a list of at least five assets and three effects with visibly different card heights.
2. Reorder adjacent items, then move first to last, then perform two drops rapidly.
3. Inspect the console for rejected animation promises or React warnings.
4. Record at 0.25×. Rows should move along one direct vertical path with no scale, bounce, overshoot, or single-frame jump on rapid reorder.
5. In the Performance panel, confirm the animation is transform-only and does not trigger per-frame layout.
6. Enable reduced motion and confirm order changes are instantaneous.
