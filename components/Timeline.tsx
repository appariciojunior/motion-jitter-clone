'use client';

import { useEffect, useState } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import ExportDialog from './ExportDialog';

function fmt(sec: number) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${r}`;
}

// Figma ruler: a label every 2s, three short dashes between labels.
function buildRuler(duration: number) {
  const labels: { t: number; pct: number }[] = [];
  const dashes: number[] = [];
  for (let t = 0; t <= duration; t += 2) {
    labels.push({ t, pct: (t / duration) * 100 });
    if (t + 2 <= duration) {
      const w = (2 / duration) * 100;
      for (let k = 1; k <= 3; k++) dashes.push(((t / duration) * 100) + (w * k) / 4);
    }
  }
  return { labels, dashes };
}

export default function Timeline() {
  const frame = useSceneStore((s) => s.frame);
  const fps = useSceneStore((s) => s.fps);
  const duration = useSceneStore((s) => s.duration);
  const playing = useSceneStore((s) => s.playing);
  const setPlaying = useSceneStore((s) => s.setPlaying);
  const setFrame = useSceneStore((s) => s.setFrame);
  const setDuration = useSceneStore((s) => s.setDuration);
  const [showExport, setShowExport] = useState(false);

  // Spacebar toggles play/pause anywhere except while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      const s = useSceneStore.getState();
      s.setPlaying(!s.playing);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const curTime = frame / fps;
  const progress = (frame / (totalFrames - 1 || 1)) * 100;
  const { labels, dashes } = buildRuler(duration);

  return (
    <div className="timeline">
      <button className="play-btn" onClick={() => setPlaying(!playing)} title={playing ? 'Pause' : 'Play'}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="2.5" width="3" height="9" rx="1" fill="currentColor"/><rect x="8" y="2.5" width="3" height="9" rx="1" fill="currentColor"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 2.8v8.4c0 .8.9 1.3 1.6.9l6.6-4.2c.6-.4.6-1.4 0-1.8L5.6 1.9c-.7-.4-1.6.1-1.6.9z" fill="currentColor"/></svg>
        )}
      </button>

      <span className="time-readout"><b>{fmt(curTime)}</b> / {fmt(duration)}s</span>

      <div className="scrubber">
        <div className="tl-trackbar" />
        <div className="ruler">
          {dashes.map((pct, i) => (
            <span key={`d${i}`} className="ruler-dash" style={{ left: `${pct}%`, width: 8 }} />
          ))}
          {labels.map(({ t, pct }) => (
            <span key={`l${t}`} className="ruler-label" style={{ left: `${pct}%` }}>{t}s</span>
          ))}
        </div>
        <div className="playhead" style={{ left: `${progress}%` }}>
          <span className="playhead-chip">{curTime.toFixed(1)}s</span>
        </div>
        <input
          type="range" min={0} max={totalFrames - 1} step={1} value={frame}
          onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }}
        />
      </div>

      <span className="tl-divider" />

      <label className="dur-field">
        <input type="number" min={1} max={60} step={1} value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))} />
        <span>s</span>
      </label>

      <button className="export-btn" onClick={() => setShowExport(true)}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Export
      </button>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
