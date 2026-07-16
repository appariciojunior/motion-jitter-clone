'use client';

import { getThreeEffect, threeEffects } from '@/three3d';
import { use3DStore } from '@/store/use3DStore';
import { ControlRow } from './Controls';

// Right column in 3D mode — renders the active 3D effect's control groups
// (Characters, Intensity, Lights, Tint, Post-Processing, …). Writes live into
// use3DStore; the stage + renderer read the values every frame.
export default function Effect3DControls() {
  const storeEffectId = use3DStore((s) => s.effectId);
  const def = getThreeEffect(storeEffectId) ?? threeEffects[0];   // guard stale ids
  const effectId = def.id;
  const params = use3DStore((s) => s.params[effectId]) ?? {};
  const setParam = use3DStore((s) => s.setParam);

  return (
    <>
      <div className="section-head"><span className="eyebrow">{def.name} Controls</span></div>
      <div className="section-body e3d-controls">
        {def.groups.map((g) => (
          <div key={g.title} className="e3d-group">
            <div className="e3d-group-title">{g.title}</div>
            {g.controls.map((c) => (
              <ControlRow
                key={c.key}
                def={c}
                value={params[c.key] ?? c.default}
                onChange={(v) => setParam(effectId, c.key, v)}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
