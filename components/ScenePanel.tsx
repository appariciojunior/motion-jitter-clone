'use client';

import { useMemo } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { EASING_PRESETS, easingPresetName } from '@/lib/easing';
import type { CubicBezier, ControlDef } from '@/lib/types';
import { getTemplate } from '@/templates';
import { ControlRow } from './Controls';

function ControlsSection({ controls }: { controls: ControlDef[] }) {
  const values = useSceneStore((s) => s.values);
  const setValue = useSceneStore((s) => s.setValue);
  return (
    <div className="section-body">
      {controls.map((def) => (
        <ControlRow
          key={def.key}
          def={def}
          value={values[def.key]}
          onChange={(value) => setValue(def.key, value)}
        />
      ))}
    </div>
  );
}

function EasingEditor() {
  const easing = useSceneStore((s) => s.easing);
  const setEasing = useSceneStore((s) => s.setEasing);
  const activeName = easingPresetName(easing);
  const keys: (keyof CubicBezier)[] = ['h1x', 'h1y', 'h2x', 'h2y'];
  const curvePath = `M14 154 C${14 + easing.h1x * 196} ${154 - easing.h1y * 126}, ${14 + easing.h2x * 196} ${154 - easing.h2y * 126}, 210 28`;
  const h1 = { x: 14 + easing.h1x * 196, y: 154 - easing.h1y * 126 };
  const h2 = { x: 14 + easing.h2x * 196, y: 154 - easing.h2y * 126 };

  return (
    <div className="section-body easing-editor">
      <div className="bezier-preview" aria-label="Cubic bezier preview">
        <svg viewBox="0 0 224 176" aria-hidden="true">
          <defs>
            <pattern id="bezier-dots" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="16" cy="16" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="224" height="176" fill="url(#bezier-dots)" />
          <path className="bezier-handle-line" d={`M14 154 L${h1.x} ${h1.y} M210 28 L${h2.x} ${h2.y}`} />
          <path className="bezier-curve" d={curvePath} />
          <circle className="bezier-dot" cx={h1.x} cy={h1.y} r="6" />
          <circle className="bezier-dot" cx={h2.x} cy={h2.y} r="6" />
        </svg>
      </div>

      <div className="bezier-grid" aria-label="Cubic bezier handles">
        {keys.map((key) => (
          <label key={key}>
            <input
              type="number"
              min={0}
              max={1}
              step={0.001}
              value={easing[key]}
              onChange={(event) => setEasing({ ...easing, [key]: Math.max(0, Math.min(1, Number(event.target.value))) })}
            />
          </label>
        ))}
      </div>

      <div className="easing-mode" aria-label="Easing mode">
        <span className={activeName !== 'Custom' ? 'active' : ''}>Defaults</span>
        <span className={activeName === 'Custom' ? 'active' : ''}>Custom</span>
      </div>

      <div className="easing-list">
        {EASING_PRESETS.map((preset) => (
          <button
            key={preset.name}
            className={`easing-option ${activeName === preset.name ? 'active' : ''}`}
            onClick={() => setEasing(preset)}
          >
            <span>{preset.name}</span>
            <svg width="25" height="17" viewBox="0 0 25 17" aria-hidden="true">
              <path
                d={`M2 14 C${2 + preset.h1x * 21} ${14 - preset.h1y * 11}, ${2 + preset.h2x * 21} ${14 - preset.h2y * 11}, 23 3`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ScenePanel() {
  const activeTemplateId = useSceneStore((s) => s.activeTemplateId);
  const resetTemplate = useSceneStore((s) => s.resetTemplate);
  const template = getTemplate(activeTemplateId);

  const sections = useMemo(() => {
    const grouped = new Map<string, ControlDef[]>();
    for (const control of template.controls) {
      const section = control.section || 'Scene';
      if (section === 'Easing') continue;
      if (!grouped.has(section)) grouped.set(section, []);
      grouped.get(section)!.push(control);
    }
    return Array.from(grouped.entries());
  }, [template]);

  return (
    <>
      {sections.map(([section, controls], index) => (
        <div key={section} className="scene-control-section">
          {index > 0 && <div className="hairline" />}
          <div className="section-head">
            <span className="eyebrow">{section}</span>
            {index === 0 && <span className="badge scene-preset-name">{template.meta.name}</span>}
          </div>
          <ControlsSection controls={controls} />
        </div>
      ))}

      <div className="hairline" />
      <div className="section-head"><span className="eyebrow">Easing</span></div>
      <EasingEditor />

      <div className="section-body scene-reset-wrap">
        <button className="btn full" onClick={resetTemplate}>Reset all values</button>
      </div>
    </>
  );
}
