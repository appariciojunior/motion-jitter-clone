'use client';

import { useEffect, useRef } from 'react';
import { SceneRenderer } from '@/lib/renderer';
import { setRendererInstance } from '@/lib/rendererInstance';
import { useSceneStore } from '@/store/useSceneStore';

export default function PreviewStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SceneRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const anchorTimeRef = useRef<number>(0);   // wall-clock at playback start
  const anchorFrameRef = useRef<number>(0);  // frame at playback start

  const width = useSceneStore((s) => s.width);
  const height = useSceneStore((s) => s.height);

  useEffect(() => {
    let mounted = true;
    const r = new SceneRenderer();

    const loop = () => {
      const st = useSceneStore.getState();
      let frame = st.frame;
      if (st.playing) {
        const now = performance.now();
        if (anchorTimeRef.current === 0) {
          anchorTimeRef.current = now;
          anchorFrameRef.current = st.frame;
        }
        const elapsed = (now - anchorTimeRef.current) / 1000;
        const total = Math.max(1, Math.round(st.duration * st.fps));
        frame = Math.floor(anchorFrameRef.current + elapsed * st.fps) % total;
        if (frame !== st.frame) st.setFrame(frame);
      } else {
        anchorTimeRef.current = 0;
      }
      const rr = rendererRef.current;
      if (rr) {
        rr.getFrameState(frame);
        rr.app.renderer.render(rr.app.stage);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    r.init(canvasRef.current!).then(() => {
      if (!mounted) { r.destroy(); return; }
      rendererRef.current = r;
      setRendererInstance(r);
      rafRef.current = requestAnimationFrame(loop);
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      setRendererInstance(null);
      rendererRef.current = null;
      r.destroy();
    };
  }, []);

  // live resize on aspect/fps-driven dimension changes
  useEffect(() => {
    rendererRef.current?.resize(width, height);
  }, [width, height]);

  return (
    <div className="stage-wrap">
      <canvas ref={canvasRef} className="stage-canvas" />
    </div>
  );
}
