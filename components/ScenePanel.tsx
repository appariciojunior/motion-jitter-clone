'use client';

import { useSceneStore } from '@/store/useSceneStore';
import { getTemplate, templateList } from '@/templates';
import { ControlRow } from './Controls';

// Renders the SCENE + TIMING sections (no card wrapper — the page composes cards).
export default function ScenePanel() {
  const activeTemplateId = useSceneStore((s) => s.activeTemplateId);
  const values = useSceneStore((s) => s.values);
  const setValue = useSceneStore((s) => s.setValue);
  const setActiveTemplate = useSceneStore((s) => s.setActiveTemplate);
  const duration = useSceneStore((s) => s.duration);
  const setDuration = useSceneStore((s) => s.setDuration);

  const template = getTemplate(activeTemplateId);

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Scene</span>
        <select
          className="badge"
          value={activeTemplateId}
          onChange={(e) => setActiveTemplate(e.target.value)}
          style={{ paddingRight: 22 }}
        >
          {templateList.map((t) => <option key={t.meta.id} value={t.meta.id}>{t.meta.name}</option>)}
        </select>
      </div>
      <div className="section-body">
        {template.controls.map((def) => (
          <ControlRow key={def.key} def={def} value={values[def.key]} onChange={(val) => setValue(def.key, val)} />
        ))}
      </div>

      <div className="hairline" />

      <div className="section-head"><span className="eyebrow">Timing</span></div>
      <div className="section-body">
        <ControlRow
          def={{ key: '_duration', label: 'Duration', type: 'slider', min: 1, max: 30, step: 1, default: 8 }}
          value={duration}
          onChange={(v) => setDuration(Math.max(1, Number(v)))}
        />
      </div>
    </>
  );
}
