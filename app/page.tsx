'use client';

import { useRef } from 'react';
import IconRail from '@/components/IconRail';
import TemplatesCard from '@/components/TemplatesCard';
import ScenePanel from '@/components/ScenePanel';
import CanvasPanel from '@/components/CanvasPanel';
import EffectsPanel from '@/components/EffectsPanel';
import AssetsPanel from '@/components/AssetsPanel';
import Timeline from '@/components/Timeline';
import PreviewStage from '@/components/PreviewStage';

export default function Home() {
  const stageRef = useRef<HTMLElement>(null);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void stageRef.current?.requestFullscreen();
    }
  };

  return (
    <div className="app">
      <IconRail />

      <TemplatesCard />

      <section className="card controls card-scroll">
        <ScenePanel />
        <div className="hairline" />
        <EffectsPanel />
      </section>

      <main ref={stageRef} className="stage-col">
        <PreviewStage />
        <button className="stage-fs" title="Toggle fullscreen" onClick={toggleFullscreen}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </main>

      <section className="card right card-scroll">
        <CanvasPanel />
        <div className="hairline" />
        <AssetsPanel />
      </section>

      <footer className="card bottom">
        <Timeline />
      </footer>
    </div>
  );
}
