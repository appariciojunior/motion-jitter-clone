# Animate asset and effect list presence

- Status: DONE
- Implementation: current working tree (uncommitted by request)
- Priority: HIGH
- Category: Missed opportunity / physicality
- Baseline commit: `a0cd5fd`
- Depends on: none
- Follow-up: `002-flip-list-reordering.md` handles drag-and-drop order changes

## Context and evidence

Assets and effects are persistent editor lists. Adding or removing an item currently changes the DOM in one frame, even though their CSS already declares opacity and transform transitions.

Current removal paths:

```tsx
// components/AssetsPanel.tsx
<button className="icon-btn" title="Remove" onClick={() => removeAsset(a.id)}>
```

```tsx
// components/EffectsPanel.tsx
<button className="icon-btn" onClick={() => removeEffect(e.instanceId)}>
```

Current styles:

```css
.asset-item {
  transition: background-color var(--t-fast), opacity var(--t-fast), transform var(--t-control);
}
.effect-card {
  transition: opacity var(--t-fast), transform var(--t-control);
}
```

The store removes synchronously with `filter`, so CSS never sees a leaving state.

## Goal

Give newly added rows a quiet entrance and keep removed rows mounted for a short exit. The interaction must remain immediate: the visual exit begins on the same pointer event, and the underlying store deletion occurs after 150ms.

## Exact motion specification

- Enter: opacity `0 → 1`, translateY `4px → 0`, `200ms`, `var(--ease-out)` (`cubic-bezier(0, 0, .2, 1)`).
- Exit: opacity `1 → 0`, translateY `0 → -4px`, `150ms`, `var(--ease-standard)` (`cubic-bezier(.4, 0, .2, 1)`).
- Leaving rows must set `pointer-events: none` and `draggable={false}`.
- Repeated removal requests for the same ID must be ignored.
- Under `prefers-reduced-motion: reduce`, delete immediately and do not translate.
- Do not animate toggle visibility/enabled state, thumbnail loading, field edits, or asset count text.

## Files to change

- Add `lib/useAnimatedRemoval.ts`.
- Edit `components/AssetsPanel.tsx`.
- Edit `components/EffectsPanel.tsx`.
- Edit `app/globals.css`.

Do not change `store/useSceneStore.ts`; its synchronous actions remain the source of truth.

## Implementation steps

1. Add a generic client hook in `lib/useAnimatedRemoval.ts` with this public contract:

   ```ts
   export function useAnimatedRemoval(
     remove: (id: string) => void,
     duration = 150,
   ): {
     isLeaving: (id: string) => boolean;
     requestRemoval: (id: string) => void;
   }
   ```

   Store leaving IDs in React state and timer IDs in a ref. `requestRemoval` must:

   - return immediately if the ID is already leaving;
   - call `remove(id)` immediately when `matchMedia('(prefers-reduced-motion: reduce)').matches`;
   - otherwise add the ID to the leaving set and schedule `remove(id)` after `duration`;
   - remove the ID from the leaving set after the store mutation;
   - clear all pending timers on unmount so a remounted panel cannot receive stale updates.

2. In `AssetsPanel.tsx`, initialize the hook with the existing `removeAsset` action. For each `<li>`:

   - append `leaving` to `className` when `isLeaving(a.id)` is true;
   - set `draggable={!isLeaving(a.id)}`;
   - route the remove button through `requestRemoval(a.id)`.

   Preserve the existing `dragging` class and drag handlers. Do not change `Clear all` in this plan; clearing a whole collection needs separate bulk choreography and should remain immediate.

3. In `EffectsPanel.tsx`, make the equivalent changes using `e.instanceId` and `removeEffect`.

4. In `app/globals.css`, add one shared entrance keyframe and leaving rules:

   ```css
   .asset-item,
   .effect-card {
     animation: editor-row-in var(--motion-control) var(--ease-out);
   }

   .asset-item.leaving,
   .effect-card.leaving {
     pointer-events: none;
     animation: editor-row-out var(--motion-fast) var(--ease-standard) both;
   }

   @keyframes editor-row-in {
     from { opacity: 0; transform: translateY(4px); }
     to { opacity: 1; transform: translateY(0); }
   }

   @keyframes editor-row-out {
     from { opacity: 1; transform: translateY(0); }
     to { opacity: 0; transform: translateY(-4px); }
   }
   ```

   Keep the existing transition declarations because they serve dragging, disabled state, and the later FLIP plan.
   Do not use `animation-fill-mode: forwards` or `both` for the entrance: a retained animation opacity would override `.effect-card.disabled` and `.asset-item.dragging` after the entrance completes.

5. Add an explicit reduced-motion override in the existing media query so `.leaving` rows have `transform: none`. The global 1ms duration override remains in force.

## Acceptance criteria

- Adding one or several assets animates only the new rows.
- Adding an effect animates only the new card.
- Clicking remove immediately starts the exit; the row is deleted about 150ms later.
- Double-clicking remove does not call the store action twice.
- A leaving row cannot be dragged or clicked.
- Reduced-motion mode removes immediately with no translation.
- No dependency is added.

## Verification and feel-check

1. Run the repo's normal type/build check after implementation.
2. Add three assets and two effects. Remove the middle item in each list and confirm there is no flash or duplicate removal.
3. Record at 0.25× playback. The exit should read as acknowledgement, not as an item flying away; total visible exit must be 150ms.
4. Enable reduced motion in DevTools and repeat removal. Confirm no spatial movement and no intentional delay.
5. Reorder an item after a removal and confirm native dragging still works. The immediate sibling gap closure is acceptable in this plan and is not a reason to lengthen the exit.
