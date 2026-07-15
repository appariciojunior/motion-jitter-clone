'use client';

import dynamic from 'next/dynamic';
import IconRail from '@/components/IconRail';
import TemplatesCard from '@/components/TemplatesCard';
import ScenePanel from '@/components/ScenePanel';
import CanvasPanel from '@/components/CanvasPanel';
import EffectsPanel from '@/components/EffectsPanel';
import AssetsPanel from '@/components/AssetsPanel';
import Timeline from '@/components/Timeline';

// Pixi must run client-side only.
const PreviewStage = dynamic(() => import('@/components/PreviewStage'), { ssr: false });

export default function Home() {
  return (
    <div className="app">
      <IconRail />

      <TemplatesCard />

      <section className="card controls card-scroll">
        <ScenePanel />
        <div className="hairline" />
        <EffectsPanel />
      </section>

      <main className="stage-col">
        <PreviewStage />
        <button className="stage-fs" title="Fullscreen">
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
