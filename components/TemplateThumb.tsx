'use client';

import { useMemo } from 'react';
import type { Template } from '@/lib/types';
import { defaultsFor } from '@/templates';

// Live template thumbnail: run the template's own transform at a fixed frame
// and render the resulting card layout as plain divs. Because it uses the real
// transform + declared defaults, thumbs always match the actual motion.
const THUMB_FRAME = 40;              // ~1.3s in — mid-motion pose
const CTX = { fps: 30, width: 810, height: 1080 }; // 3:4 preview space
const TEX_W = 480, TEX_H = 600;      // placeholder texture proportions
const SPRITE_BASE = 340;

interface CardPose {
  x: number; y: number; w: number; h: number;
  rotation: number; skewX: number; alpha: number; z: number; r: number;
}

export default function TemplateThumb({ template }: { template: Template }) {
  const poses = useMemo<CardPose[]>(() => {
    const v = defaultsFor(template.meta.id);
    const count = Math.max(1, Math.min(20, Math.round(v.count ?? 6)));
    const norm = SPRITE_BASE / Math.max(TEX_W, TEX_H);
    const out: CardPose[] = [];
    for (let i = 0; i < count; i++) {
      const t = template.transform(THUMB_FRAME, i, count, v, CTX);
      const w = TEX_W * norm * t.scale;
      const h = TEX_H * norm * t.scale;
      out.push({
        x: t.x, y: t.y, w, h,
        rotation: t.rotation,
        skewX: t.skewX ?? 0,
        alpha: t.alpha,
        z: Math.round(t.depth * 1000 + i),
        r: (Math.min(w, h) / 2) * Math.max(0, Math.min(1, (v.cornerRadius ?? 0) / 100)),
      });
    }
    return out;
  }, [template]);

  // scale preview space → thumbnail space (thumb is 3:4 like CTX)
  return (
    <div className="tpl-thumb">
      {poses.map((p, i) => (
        <div
          key={i}
          className="tpl-thumb-el"
          style={{
            width: `${(p.w / CTX.width) * 100}%`,
            aspectRatio: `${TEX_W} / ${TEX_H}`,
            left: `${50 + (p.x / CTX.width) * 100}%`,
            top: `${50 + (p.y / CTX.height) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${p.rotation}rad) skewX(${p.skewX}rad)`,
            opacity: p.alpha,
            zIndex: p.z,
            borderRadius: `${Math.max(1, (p.r / p.w) * 100)}%`,
          }}
        />
      ))}
    </div>
  );
}
