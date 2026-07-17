'use client';

import { useUIStore } from '@/store/useUIStore';

// The left column (templates / 3D effects) folds to a strip so the stage can
// have the width on a small display. Two halves: the chevron that lives in the
// panel header, and the strip that replaces the panel once it's folded.

export function CollapseButton() {
  const toggle = useUIStore((s) => s.toggleTplCollapsed);
  return (
    <button className="tpl-collapse" onClick={toggle} title="Collapse panel" aria-label="Collapse panel">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

export function CollapsedStrip() {
  const toggle = useUIStore((s) => s.toggleTplCollapsed);
  return (
    <aside className="card templates tpl-strip">
      <button className="tpl-expand" onClick={toggle} title="Expand panel" aria-label="Expand panel">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </aside>
  );
}
