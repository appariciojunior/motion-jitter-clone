export type PathKind = 'line' | 'arc' | 'ring' | 'zwall';

export interface CardPathParams {
  kind: PathKind;
  index: number;
  count: number;
  phase: number;      // advancing position along the path, in "card units"
  radius?: number;    // arc/ring/zwall
  gap?: number;       // line/arc spacing
  arcSpan?: number;   // radians, for arc
  wrap?: boolean;     // line: recycle cards into a symmetric window → seamless loop
}

export interface CardPathResult {
  x: number;
  y: number;
  featuredness: number;  // 1 = at phase centre, → 0 with distance
  depthNorm: number;     // 0..1 along path, for depth sorting & fake-3D scale
}

// slot position relative to the moving phase, in card units
// e.g. index 3 with phase 2.4 → offset 0.6
export function cardPath(p: CardPathParams): CardPathResult {
  let offset = p.index - p.phase;                   // signed distance from centre
  // Optional wrap: fold offset into [-count/2, count/2) so cards recycle endlessly
  // and always fill both sides of the view (seamless carousel loop). Applies to
  // line AND arc paths (ring wraps intrinsically via its angle).
  if (p.wrap && p.count > 0) {
    offset = ((offset % p.count) + p.count) % p.count;
    if (offset > p.count / 2) offset -= p.count;
  }
  const dist = Math.abs(offset);
  const featuredness = Math.max(0, 1 - dist);       // linear falloff; templates may curve it

  let x = 0, y = 0, depthNorm = 0.5;

  switch (p.kind) {
    case 'line': {                                   // Carousel / Stories strip
      x = offset * (p.gap ?? 200);
      y = 0;
      depthNorm = 1 - Math.min(1, dist / (p.count / 2));
      break;
    }
    case 'arc': {                                    // Wheel arc / fan
      const span = p.arcSpan ?? Math.PI;             // total sweep
      const a = -span / 2 + (offset + p.count / 2) * (span / p.count);
      x = Math.sin(a) * (p.radius ?? 400);
      y = -Math.cos(a) * (p.radius ?? 400) + (p.radius ?? 400);
      depthNorm = 1 - Math.min(1, dist / (p.count / 2));
      break;
    }
    case 'ring': {                                   // Wheel full ring
      const a = (p.index / p.count) * Math.PI * 2 - p.phase * (Math.PI * 2 / p.count);
      x = Math.sin(a) * (p.radius ?? 400);
      y = -Math.cos(a) * (p.radius ?? 400);
      depthNorm = (Math.cos(a) + 1) / 2;             // front of ring = nearer
      break;
    }
    case 'zwall': {                                  // 3D depth wall
      // cards recede along Z; nearer = bigger, later slots further back
      const z = offset;                              // in card units
      depthNorm = 1 - Math.min(1, Math.max(0, (z + p.count / 2) / p.count));
      x = 0; y = 0;                                  // template applies perspective scale via depthNorm
      break;
    }
  }
  return { x, y, featuredness, depthNorm };
}
