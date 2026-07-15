# Animation improvement plans

Audit basis: commit `a0cd5fd` plus the current working-tree fluidity changes. Those existing changes include the motion tokens in `styles/tokens.css`; do not discard or overwrite them when executing these plans.

The linked `AUDIT.md` and `PLAN-TEMPLATE.md` referenced by the supplied workflow were not present in the attachment. These plans therefore use the repository's existing durations and easing tokens as the authoritative values.

| Plan | Priority | Status | Dependency | Outcome |
| --- | --- | --- | --- | --- |
| [001 — Animate list presence](001-animate-list-presence.md) | HIGH | DONE | None | Asset/effect rows enter and leave with clear continuity |
| [002 — FLIP list reordering](002-flip-list-reordering.md) | HIGH | DONE | 001 recommended | Reordered and displaced rows settle instead of jumping |
| [003 — Symmetric modal dismissal](003-symmetric-export-modal-dismissal.md) | MEDIUM | DONE | None | Export modal exits as deliberately as it enters |
| [004 — Export phase fade-through](004-export-phase-fade-through.md) | MEDIUM | DONE | None | Export state changes stop blinking between shapes |
| [005 — Pointer action feedback](005-pointer-primary-action-feedback.md) | LOW | DONE | None | Primary actions acknowledge fine-pointer presses |

## Recommended execution order

1. Execute 001, then 002. They touch the same list components, so this order minimizes merge friction; presence and reordering remain independent behaviors.
2. Execute 003, then 004. They touch the same dialog and CSS block but manage independent state machines; doing them consecutively reduces merge friction.
3. Execute 005 last. It is isolated CSS polish and should be judged after the structural motion is stable.

After each plan, update its status here to `DONE`, `BLOCKED`, or `RETIRED` and record the implementing commit in that plan's header.
