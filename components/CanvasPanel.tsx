'use client';

import { useId, useState } from 'react';
import { useSceneStore, ASPECTS } from '@/store/useSceneStore';
import { ControlRow } from './Controls';

const FPS_OPTIONS = [30, 60];
const BG_SOURCES: { id: 'color' | 'image' | 'card'; label: string }[] = [
  { id: 'color', label: 'Color' },
  { id: 'image', label: 'Image' },
  { id: 'card', label: 'From card' },
];

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="collapsible">
      <button
        className={`collapsible-head ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="c-label">{title}</span>
        <span className="chev">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2L7 5l-3.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>
      <div className={`collapsible-grid ${open ? 'open' : ''}`}>
        <div
          id={panelId}
          className="collapsible-clip"
          aria-hidden={!open}
          inert={!open}
        >
          <div className="collapsible-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function CanvasPanel() {
  const aspect = useSceneStore((s) => s.aspect);
  const setAspect = useSceneStore((s) => s.setAspect);
  const fps = useSceneStore((s) => s.fps);
  const setFps = useSceneStore((s) => s.setFps);
  const safeArea = useSceneStore((s) => s.safeArea);
  const toggleSafeArea = useSceneStore((s) => s.toggleSafeArea);
  const background = useSceneStore((s) => s.background);
  const setBackground = useSceneStore((s) => s.setBackground);
  const logo = useSceneStore((s) => s.logo);
  const setLogo = useSceneStore((s) => s.setLogo);
  const setAudioUrl = useSceneStore((s) => s.setAudioUrl);
  const audioUrl = useSceneStore((s) => s.audioUrl);

  return (
    <>
      <div className="section-head"><span className="eyebrow">Canvas</span></div>
      <div className="section-body">
        <div className="ctl-row">
          <label className="ctl-label">Aspect</label>
          <div className="pills">
            {Object.keys(ASPECTS).map((a) => (
              <button key={a} className={`pill ${aspect === a ? 'active' : ''}`} onClick={() => setAspect(a)}>{a}</button>
            ))}
          </div>
        </div>

        <div className="ctl-row">
          <label className="ctl-label">FPS</label>
          <div className="pills">
            {FPS_OPTIONS.map((f) => (
              <button key={f} className={`pill ${fps === f ? 'active' : ''}`} onClick={() => setFps(f)}>{f}</button>
            ))}
          </div>
        </div>

        <div className="ctl-row">
          <label className="ctl-label">Safe area</label>
          <div className="segmented">
            <button className={`seg ${!safeArea ? 'active' : ''}`} onClick={() => safeArea && toggleSafeArea()}>Off</button>
            <button className={`seg ${safeArea ? 'active' : ''}`} onClick={() => !safeArea && toggleSafeArea()}>On</button>
          </div>
        </div>
      </div>

      <div className="hairline" />
      <div className="section-body" style={{ paddingTop: 4 }}>
        <Collapsible title="Background">
          <div className="ctl-row">
            <label className="ctl-label">Source</label>
            <div className="pills">
              {BG_SOURCES.map((src) => (
                <button key={src.id} className={`pill ${background.source === src.id ? 'active' : ''}`} onClick={() => setBackground({ source: src.id })}>{src.label}</button>
              ))}
            </div>
          </div>

          {background.source === 'color' && (
            <>
              <ControlRow def={{ key: 'bgc', label: 'Colour', type: 'color', default: '' }} value={background.color} onChange={(v) => setBackground({ color: v })} />
              <div className="ctl-row">
                <label className="ctl-label">Gradient</label>
                <div className="segmented">
                  <button className={`seg ${!background.gradient ? 'active' : ''}`} onClick={() => setBackground({ gradient: false })}>Off</button>
                  <button className={`seg ${background.gradient ? 'active' : ''}`} onClick={() => setBackground({ gradient: true })}>On</button>
                </div>
              </div>
              {background.gradient && (
                <ControlRow def={{ key: 'bgc2', label: 'Colour 2', type: 'color', default: '' }} value={background.color2} onChange={(v) => setBackground({ color2: v })} />
              )}
            </>
          )}

          {background.source === 'image' && (
            <>
              <div className="ctl-row">
                <label className="ctl-label">Image</label>
                <label className="upload">
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setBackground({ imageUrl: URL.createObjectURL(f) }); }} />
                  <span>{background.imageUrl ? 'Replace…' : 'Upload…'}</span>
                </label>
              </div>
              <ControlRow def={{ key: 'bgblur', label: 'Blur', type: 'slider', min: 0, max: 100, step: 1, default: 28 }} value={background.blur} onChange={(v) => setBackground({ blur: Number(v) })} />
            </>
          )}

          {background.source === 'card' && (
            <>
              <div className="ctl-hint">Reflects the featured card — the background moves with the animation.</div>
              <ControlRow def={{ key: 'bgblur', label: 'Blur', type: 'slider', min: 0, max: 100, step: 1, default: 28 }} value={background.blur} onChange={(v) => setBackground({ blur: Number(v) })} />
            </>
          )}
        </Collapsible>

        <Collapsible title="Logo">
          <div className="ctl-row">
            <label className="ctl-label">Image</label>
            <label className="upload">
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setLogo({ url: URL.createObjectURL(f) }); }} />
              <span>{logo.url ? 'Replace…' : 'Upload…'}</span>
            </label>
          </div>
          <div className="ctl-row">
            <label className="ctl-label">Corner</label>
            <div className="pills">
              {(['tl', 'tr', 'bl', 'br'] as const).map((p) => (
                <button key={p} className={`pill ${logo.position === p ? 'active' : ''}`} onClick={() => setLogo({ position: p })}>{p.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </Collapsible>

        <Collapsible title="Audio">
          <div className="ctl-row">
            <label className="ctl-label">Track</label>
            <label className="upload">
              <input type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAudioUrl(URL.createObjectURL(f)); }} />
              <span>{audioUrl ? 'Replace…' : 'Upload…'}</span>
            </label>
          </div>
        </Collapsible>
      </div>
    </>
  );
}
