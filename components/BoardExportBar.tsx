'use client';

import { useState } from 'react';
import { downloadSceneZip } from '@/lib/exportScene';

// Board mode — the export control for the timeline bar, mirroring WebSourceBar.
// Packs the live scene (runtime + config + preview + README) into a zip.
export default function BoardExportBar() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setErr(null);
    try {
      await downloadSceneZip();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="web-source-bar">
      {err && (
        <span className="web-source-err" title={err}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 5v3.5M8 10.8v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          {err}
        </span>
      )}
      <button
        className="export-btn"
        onClick={download}
        disabled={busy}
        title="Download the scene bundle (runtime + config + preview) as a zip"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0L5 7m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {busy ? 'Packing…' : 'Export zip'}
      </button>
    </div>
  );
}
