'use client';

import { useState } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { getRendererInstance } from '@/lib/rendererInstance';

type Fmt = 'mp4' | 'gif' | 'both';
type Phase = 'idle' | 'capturing' | 'encoding' | 'done' | 'error';

async function post(body: any) {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function ExportDialog({ onClose }: { onClose: () => void }) {
  const store = useSceneStore;
  const [format, setFormat] = useState<Fmt>('mp4');
  const [phase, setPhase] = useState<Phase>('idle');
  const [captured, setCaptured] = useState(0);
  const [total, setTotal] = useState(0);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [err, setErr] = useState('');

  const run = async () => {
    const s = store.getState();
    const renderer = getRendererInstance();
    if (!renderer) { setErr('Renderer not ready'); setPhase('error'); return; }

    const totalFrames = Math.max(1, Math.round(s.duration * s.fps));
    const wasPlaying = s.playing;
    s.setPlaying(false);
    setTotal(totalFrames);
    setPhase('capturing');
    setErr('');

    try {
      const { sessionId } = await post({ action: 'begin' });

      for (let f = 0; f < totalFrames; f++) {
        const dataUrl = renderer.captureFrame(f);       // time = frame counter, never wall-clock
        await post({ action: 'frame', sessionId, index: f, dataUrl });
        setCaptured(f + 1);
        // yield to keep UI responsive
        if (f % 5 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      setPhase('encoding');

      // audio bytes (blob url → base64) if present
      let audio: string | undefined;
      if (s.audioUrl) {
        const buf = await (await fetch(s.audioUrl)).arrayBuffer();
        audio = btoa(String.fromCharCode(...new Uint8Array(buf)));
      }

      const { files } = await post({
        action: 'encode',
        sessionId,
        fps: s.fps,
        format,
        width: s.width,
        height: s.height,
        audio,
      });

      setOutputs(files);
      setPhase('done');
      s.setFrame(s.frame);
      if (wasPlaying) s.setPlaying(true);
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setPhase('error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>Export</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="ctl-row">
            <label className="ctl-label">Format</label>
            <div className="ctl-input">
              <div className="pills">
                {(['mp4', 'gif', 'both'] as Fmt[]).map((f) => (
                  <button key={f} className={`pill ${format === f ? 'active' : ''}`} onClick={() => setFormat(f)}>{f.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          {phase === 'idle' && (
            <button className="btn primary full" onClick={run}>Start export</button>
          )}

          {phase === 'capturing' && (
            <div className="progress">
              <div className="progress-bar"><div style={{ width: `${(captured / total) * 100}%` }} /></div>
              <span>Capturing frames {captured}/{total}</span>
            </div>
          )}

          {phase === 'encoding' && <div className="progress"><span>Encoding with ffmpeg…</span></div>}

          {phase === 'done' && (
            <div className="export-done">
              <p>Done. Saved to <code>/exports</code>:</p>
              <ul>
                {outputs.map((f) => (
                  <li key={f}><a href={`/exports/${f}`} download>{f}</a></li>
                ))}
              </ul>
            </div>
          )}

          {phase === 'error' && (
            <div className="export-error">
              Export failed: {err}
              {/ffmpeg|ENOENT/i.test(err) && (
                <div className="export-hint">
                  ffmpeg isn’t installed. Install it, then retry:<br />
                  <code>brew install ffmpeg</code>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
