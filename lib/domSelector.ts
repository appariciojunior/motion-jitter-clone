// ============================================================
//  WEB MODE — STABLE ELEMENT SELECTORS (SPIKE)
//  A marked element has to survive a re-render of the user's source, so we
//  can't hold on to the node itself. We hold a structural path instead:
//  `:nth-child` steps from the mount root down to the element.
//
//  This is deliberately dumb. It breaks when the user edits their markup
//  above a marked element. Good enough to answer the layout question; if the
//  spike lands, this is the first thing to replace (data-attr injection at
//  compile time is the likely successor).
// ============================================================

/** Structural path from `root` (exclusive) down to `el` (inclusive). */
export function selectorFor(root: Element, el: Element): string | null {
  const steps: string[] = [];
  let node: Element | null = el;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) return null;
    const idx = Array.prototype.indexOf.call(parent.children, node) + 1;
    steps.unshift(`:nth-child(${idx})`);
    node = parent;
  }
  if (node !== root) return null;
  return steps.length ? steps.join(' > ') : null;
}

/** Resolve a path produced by `selectorFor` back to a live element. */
export function resolveSelector(root: Element, sel: string): Element | null {
  try {
    return root.querySelector(`:scope > ${sel}`);
  } catch {
    return null;
  }
}

/** A short human label for the selection list — tag + classes, truncated. */
export function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = (el.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('');
  return `${tag}${cls}`.slice(0, 28);
}
