'use client';

import dynamic from 'next/dynamic';
import IconRail from '@/components/IconRail';
import TemplatesCard from '@/components/TemplatesCard';
import ScenePanel from '@/components/ScenePanel';
import CanvasPanel from '@/components/CanvasPanel';
import EffectsPanel from '@/components/EffectsPanel';
import AssetsPanel from '@/components/AssetsPanel';
import Timeline from '@/components/Timeline';
import WelcomeDialog from '@/components/WelcomeDialog';
import Effects3DPanel from '@/components/Effects3DPanel';
import Effect3DControls from '@/components/Effect3DControls';
import ModelControl from '@/components/ModelControl';
import ModelColors from '@/components/ModelColors';
import BackgroundFill from '@/components/BackgroundFill';
import { useUIStore } from '@/store/useUIStore';

// Pixi must run client-side only.
const PreviewStage = dynamic(() => import('@/components/PreviewStage'), { ssr: false });
// Three.js 3D stage — also client-only.
const ThreeStage3D = dynamic(() => import('@/components/ThreeStage3D'), { ssr: false });

export default function Home() {
  const nav = useUIStore((s) => s.nav);
  const is3D = nav === '3d';
  return (
    <div className={`app ${is3D ? 'app-3d' : ''}`}>
      <IconRail />

      {/* left column — motion templates (2D) or 3D effect picker */}
      {is3D ? <Effects3DPanel /> : <TemplatesCard />}

      {/* middle SCENE column — 2D only (removed in 3D) */}
      {!is3D && (
        <section className="card controls card-scroll">
          <ScenePanel />
          <div className="hairline" />
          <EffectsPanel />
        </section>
      )}

      <main className="stage-col">
        {is3D ? (
          <ThreeStage3D />
        ) : (
          <>
            <PreviewStage />
            <button className="stage-fs" title="Fullscreen">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </>
        )}
      </main>

      {/* right column — canvas/assets (2D) or current 3D effect controls */}
      <section className="card right card-scroll">
        {is3D ? (
          <>
            <ModelControl />
            <div className="hairline" />
            <ModelColors />
            <div className="hairline" />
            <BackgroundFill />
            <div className="hairline" />
            <Effect3DControls />
          </>
        ) : (
          <>
            <CanvasPanel />
            <div className="hairline" />
            <AssetsPanel />
          </>
        )}
      </section>

      <footer className="card bottom">
        <Timeline />
      </footer>

      <WelcomeDialog />
    </div>
  );
}
