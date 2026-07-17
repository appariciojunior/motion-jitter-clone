'use client';

import { useWebStore } from '@/store/useWebStore';
import { ControlRow } from './Controls';
import { DimInput } from './CanvasPanel';

// Web mode (SPIKE) — layout mode and the marked elements: *what* gets
// animated. Sits above the template's own controls (WebScenePanel) in the one
// right sidebar. Source lives in the timeline — it's a single button, and a
// button never justified a column of its own.

export default function WebSelectionPanel() {
  const selected = useWebStore((s) => s.selected);
  const clearSelected = useWebStore((s) => s.clearSelected);
  const toggleSelected = useWebStore((s) => s.toggleSelected);
  const layoutMode = useWebStore((s) => s.layoutMode);
  const setLayoutMode = useWebStore((s) => s.setLayoutMode);
  const canvas = useWebStore((s) => s.canvas);
  const measured = useWebStore((s) => s.measured);
  const setCanvas = useWebStore((s) => s.setCanvas);
  const hoverPause = useWebStore((s) => s.hoverPause);
  const setHoverPause = useWebStore((s) => s.setHoverPause);
  const hoverMs = useWebStore((s) => s.hoverMs);
  const setHoverMs = useWebStore((s) => s.setHoverMs);

  // Show the live box either way, so switching off Auto starts from the size
  // the component actually renders at rather than from an empty field.
  const shown = canvas ?? measured;

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Canvas</span>
        {canvas && (
          <button className="web-auto-btn" onClick={() => setCanvas(null)}>Auto</button>
        )}
      </div>
      <div className="section-body">
        <div className="ctl-row">
          <label className="ctl-label">Size px</label>
          <div className="dim-inputs">
            <DimInput
              value={shown?.w ?? 0}
              onCommit={(v) => setCanvas({ w: v, h: shown?.h ?? v })}
            />
            <span className="dim-x">×</span>
            <DimInput
              value={shown?.h ?? 0}
              onCommit={(v) => setCanvas({ w: shown?.w ?? v, h: v })}
            />
          </div>
        </div>
        <div className="ctl-hint">
          {canvas
            ? 'The motion frame and the exported box. The preview crops to it.'
            : 'Auto — measured from your source. Type a size to pin it.'}
        </div>
      </div>

      <div className="hairline" />

      <div className="section-head">
        <span className="eyebrow">Hover</span>
      </div>
      <div className="section-body">
        <ControlRow
          def={{ key: '_hoverPause', label: 'On hover', type: 'toggle', options: ['Off', 'Ease to stop'], default: 'Ease to stop' }}
          value={hoverPause ? 'Ease to stop' : 'Off'}
          onChange={(v) => setHoverPause(v === 'Ease to stop')}
        />
        {hoverPause && (
          <>
            <ControlRow
              def={{ key: '_hoverMs', label: 'Ramp', type: 'slider', min: 0, max: 1500, step: 50, default: 450 }}
              value={hoverMs}
              onChange={(v) => setHoverMs(Number(v))}
            />
            <div className="ctl-hint">
              Uses the scene easing below. Ships as <code>motion.js</code> — optional; without it
              the CSS still animates.
            </div>
          </>
        )}
      </div>

      <div className="hairline" />

      <div className="section-head">
        <span className="eyebrow">Layout</span>
      </div>
      <div className="section-body">
        <ControlRow
          def={{
            key: '_layoutMode',
            label: 'Mode',
            type: 'pills',
            options: ['own', 'decorate'],
            default: 'own',
          }}
          value={layoutMode}
          onChange={(v) => setLayoutMode(v as 'own' | 'decorate')}
        />
        <p className="web-mode-note">
          {layoutMode === 'own'
            ? 'Template positions the marked elements from the centre. Their flex/grid layout is replaced.'
            : 'Marked elements stay where your CSS put them; only the template’s motion is applied.'}
        </p>
      </div>

      <div className="hairline" />

      <div className="section-head">
        <span className="eyebrow">Selection</span>
        <span className="badge">{selected.length}</span>
      </div>
      <div className="section-body">
        {selected.length === 0 ? (
          <p className="web-hint">Click elements in the preview to mark them as motion layers.</p>
        ) : (
          <>
            <ul className="web-sel-list">
              {selected.map((sel, i) => (
                <li key={sel} className="web-sel-row">
                  <span className="web-sel-idx">{i}</span>
                  <code className="web-sel-path">{sel.replace(/:nth-child/g, '')}</code>
                  <button className="web-sel-rm" onClick={() => toggleSelected(sel)} title="Remove">
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button className="web-clear" onClick={clearSelected}>Clear selection</button>
          </>
        )}
      </div>
    </>
  );
}
