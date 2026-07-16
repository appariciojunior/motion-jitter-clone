'use client';

import { useEffect, useRef } from 'react';
import { SceneRenderer } from '@/lib/renderer';
import type { IRenderer } from '@/lib/rendererTypes';
import { setRendererInstance } from '@/lib/rendererInstance';
import { useSceneStore } from '@/store/useSceneStore';
import { getTemplate } from '@/templates';

export default function PreviewStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const anchorTimeRef = useRef<number>(0);   // wall-clock at playback start
  const anchorFrameRef = useRef<number>(0);  // frame at playback start

  const width = useSceneStore((s) => s.width);
  const height = useSceneStore((s) => s.height);
  // Engine flag drives a full canvas remount — a canvas can never be reused
  // across GL libraries (context attributes and loss behaviour differ).
  const engine = useSceneStore((s) => getTemplate(s.activeTemplateId).meta.engine ?? 'pixi');

  useEffect(() => {
    let mounted = true;
    let renderer: IRenderer | null = null;

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
      rendererRef.current?.renderFrame(frame); // engine-agnostic realize + draw
      rafRef.current = requestAnimationFrame(loop);
    };

    (async () => {
      if (engine === 'webgl') {
        // three stays out of the bundle for 2D-only sessions
        const { SceneRenderer3D } = await import('@/lib/renderer3d');
        renderer = new SceneRenderer3D();
      } else {
        renderer = new SceneRenderer();
      }
      await renderer.init(canvasRef.current!);
      if (!mounted) { renderer.destroy(); return; }
      rendererRef.current = renderer;
      setRendererInstance(renderer);
      rafRef.current = requestAnimationFrame(loop);
    })();

    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
      setRendererInstance(null);
      rendererRef.current = null;
      renderer?.destroy();
    };
  }, [engine]);

  // live resize on aspect/fps-driven dimension changes
  useEffect(() => {
    rendererRef.current?.resize(width, height);
  }, [width, height]);

  return (
    <div className="stage-wrap">
      <canvas key={engine} ref={canvasRef} className="stage-canvas" />
    </div>
  );
}
