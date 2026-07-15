'use client';

import { useEffect, useRef } from 'react';
import { SceneRenderer } from '@/lib/renderer';
import { setRendererInstance } from '@/lib/rendererInstance';
import { useSceneStore } from '@/store/useSceneStore';

export default function PreviewStage() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mounted = true;
    let raf = 0;
    let readyRaf = 0;
    let dirty = true;
    let internalFrameUpdate = false;
    let anchorTime = 0;
    let anchorFrame = 0;
    const r = new SceneRenderer(() => {
      dirty = true;
      schedule();
    });

    const schedule = () => {
      if (!mounted || raf) return;
      raf = requestAnimationFrame(renderLatest);
    };

    const renderLatest = (now: number) => {
      raf = 0;
      const st = useSceneStore.getState();
      let frame = st.frame;

      if (st.playing) {
        if (anchorTime === 0) {
          anchorTime = now;
          anchorFrame = st.frame;
        }
        const elapsed = (now - anchorTime) / 1000;
        const total = Math.max(1, Math.round(st.timelineDuration * st.fps));
        frame = Math.floor(anchorFrame + elapsed * st.fps) % total;
        if (frame !== st.frame) {
          internalFrameUpdate = true;
          st.setFrame(frame);
          internalFrameUpdate = false;
        }
      } else {
        anchorTime = 0;
      }

      if (dirty || st.playing) {
        dirty = false;
        r.renderFrame(frame);
      }

      if (st.playing) schedule();
    };

    const unsubscribe = useSceneStore.subscribe((next, previous) => {
      if (next.width !== previous.width || next.height !== previous.height) {
        r.resize(next.width, next.height);
      }

      const clockChanged = next.playing !== previous.playing
        || next.fps !== previous.fps
        || next.timelineDuration !== previous.timelineDuration
        || next.activeTemplateId !== previous.activeTemplateId
        || (next.frame !== previous.frame && !internalFrameUpdate);

      if (clockChanged) {
        anchorTime = 0;
        anchorFrame = next.frame;
      }

      dirty = true;
      schedule();
    });

    r.init(canvasRef.current!).then(() => {
      if (!mounted) { r.destroy(); return; }
      setRendererInstance(r);
      dirty = true;
      schedule();

      // Let the first real frame paint before fading the reserved placeholder.
      readyRaf = requestAnimationFrame(() => {
        readyRaf = requestAnimationFrame(() => wrapRef.current?.classList.add('ready'));
      });
    });

    return () => {
      mounted = false;
      unsubscribe();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(readyRaf);
      setRendererInstance(null);
      r.destroy();
    };
  }, []);

  return (
    <div ref={wrapRef} className="stage-wrap" aria-label="Live scene preview">
      <div className="stage-placeholder" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <canvas ref={canvasRef} className="stage-canvas" />
    </div>
  );
}
