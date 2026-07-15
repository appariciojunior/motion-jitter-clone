'use client';

import { useState } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { effectList, getEffect, effectDefaults } from '@/effects';
import { ControlRow } from './Controls';

export default function EffectsPanel() {
  const effects = useSceneStore((s) => s.effects);
  const addEffect = useSceneStore((s) => s.addEffect);
  const removeEffect = useSceneStore((s) => s.removeEffect);
  const toggleEffect = useSceneStore((s) => s.toggleEffect);
  const reorderEffects = useSceneStore((s) => s.reorderEffects);
  const setEffectValue = useSceneStore((s) => s.setEffectValue);
  const [pick, setPick] = useState(effectList[0]?.meta.id ?? '');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  return (
    <>
      <div className="section-head"><span className="eyebrow">Effects</span></div>
      <div className="section-body">
        <div className="effect-add">
          <select className="field" value={pick} onChange={(e) => setPick(e.target.value)}>
            {effectList.map((e) => <option key={e.meta.id} value={e.meta.id}>{e.meta.name}</option>)}
          </select>
          <button className="btn" onClick={() => pick && addEffect(pick, effectDefaults(pick))}>Add</button>
        </div>

        {effects.map((e, i) => {
          const def = getEffect(e.effectId);
          if (!def) return null;
          return (
            <div
              key={e.instanceId}
              className={`effect-card ${e.enabled ? '' : 'disabled'}`}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(ev) => ev.preventDefault()}
              onDrop={() => { if (dragIdx !== null && dragIdx !== i) reorderEffects(dragIdx, i); setDragIdx(null); }}
            >
              <div className="effect-card-head">
                <span className="drag-grip">⣿</span>
                <span className="effect-title">{def.meta.name}</span>
                <button className="icon-btn" onClick={() => toggleEffect(e.instanceId)}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                    {!e.enabled && <path d="M2.5 13.5l11-11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>}
                  </svg>
                </button>
                <button className="icon-btn" onClick={() => removeEffect(e.instanceId)}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="effect-card-body">
                {def.controls.map((c) => (
                  <ControlRow key={c.key} def={c} value={e.values[c.key]} onChange={(val) => setEffectValue(e.instanceId, c.key, val)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
