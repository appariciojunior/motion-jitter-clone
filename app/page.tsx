'use client';

import { useEffect } from 'react';
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
import { useSceneStore } from '@/store/useSceneStore';
import { loadScene, startSceneAutosave } from '@/lib/scenePersist';

// Pixi must run client-side only.
const PreviewStage = dynamic(() => import('@/components/PreviewStage'), { ssr: false });
// Three.js 3D stage — also client-only.
const ThreeStage3D = dynamic(() => import('@/components/ThreeStage3D'), { ssr: false });

export default function Home() {
  const nav = useUIStore((s) => s.nav);
  const leftCollapsed = useUIStore((s) => s.leftCollapsed);
  const rightCollapsed = useUIStore((s) => s.rightCollapsed);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const is3D = nav === '3d';

  // Restore the saved scene on mount (after hydration, so no SSR mismatch), then
  // start throttled auto-save. Uploaded media urls are rebuilt from IndexedDB.
  useEffect(() => {
    useUIStore.getState().hydratePreferences();
    const saved = loadScene();
    if (saved) useSceneStore.getState().hydrate(saved);
    void useSceneStore.getState().rehydrateUploads();
    return startSceneAutosave();
  }, []);

  return (
    <div className={`app ${is3D ? 'app-3d' : ''} ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
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
        <button
          className="panel-toggle panel-toggle-left"
          onClick={toggleLeftPanel}
          aria-expanded={!leftCollapsed}
          aria-label={leftCollapsed ? 'Expand left sidebar' : 'Collapse left sidebar'}
          title={leftCollapsed ? 'Expand left sidebar' : 'Collapse left sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button
          className="panel-toggle panel-toggle-right"
          onClick={toggleRightPanel}
          aria-expanded={!rightCollapsed}
          aria-label={rightCollapsed ? 'Expand right sidebar' : 'Collapse right sidebar'}
          title={rightCollapsed ? 'Expand right sidebar' : 'Collapse right sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3.5L10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
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
