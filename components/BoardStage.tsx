'use client';

import { useEffect, useRef } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { useBoardStore } from '@/store/useBoardStore';
import { getTemplate } from '@/templates';
import { resolveEasing } from '@/lib/easing';
import { composedPoseLayers, applyCardPose, type MotionLayer } from '@/lib/boardCompose';
import { createCollectionScene, createLiftScene, type CollectionFrame } from '@/lib/sceneEngine';

// Board mode stage — plain DOM cards arranged by the board and, when motion is
// on, animated by the chosen template on top. Mirrors PreviewStage's clock (it
// owns the frame counter while playing and writes it back to the scene store,
// so the shared Timeline scrubs this mode too), but poses cards instead of
// drawing sprites.
//
// The card-scope hover interaction is NOT computed here: it lives as a pure
// layer in lib/sceneEngine. This component is only the driver — it reduces the
// pointer to input, asks the engine for each card's motion, and applies it. New
// scenes are new engine layers, never more logic in this loop.

export default function BoardStage() {
  const count = useBoardStore((s) => s.count);
  const frameW = useBoardStore((s) => s.frameW);
  const frameH = useBoardStore((s) => s.frameH);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Scale the fixed-size artboard to fit the stage, keeping its logical
  // dimensions so the cards' px poses stay exact.
  useEffect(() => {
    const stage = stageRef.current, frame = frameRef.current;
    if (!stage || !frame) return;
    const fit = () => {
      const k = Math.min(stage.clientWidth / frameW, stage.clientHeight / frameH, 1);
      frame.style.transform = `translate(-50%, -50%) scale(${k})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [frameW, frameH]);
  // The card the pointer is currently over (-1 = none). Card-scope hover reads
  // it; kept in a ref so moving between cards never re-renders the stage.
  const hoveredIdxRef = useRef(-1);
  // Live pointer position (client coords) + whether it is over the stage. The
  // collection returns home once the pointer leaves the cards' area + margin.
  const pointerRef = useRef({ x: 0, y: 0, on: false });

  useEffect(() => {
    let raf = 0;
    // Accumulator clock (like WebStage): time is integrated, because the hover
    // ramp makes the playback rate vary — it can't be derived from a fixed anchor.
    let clock = 0;          // seconds into the clip
    let lastNow = 0;
    let rate = 0;           // current playback rate
    let target = 0;         // where the rate is heading
    let rampFrom = 0;
    let rampStart = 0;      // 0 = not ramping
    let hovered = false;    // pointer currently over the board

    // Card-scope interaction layers, each isolated with its own state.
    const collection = createCollectionScene(); // scene 1 — spread
    const lift = createLiftScene();             // scene 2 — lift the focused card

    // Union box of the cards (client coords), refreshed on a throttle. The
    // return-zone is this box grown by MARGIN on every side: the collection
    // holds while the pointer is anywhere over the cards + margin, and returns
    // once it leaves that whole area (in any direction that isn't another card).
    const MARGIN = 64; // px of slack around the cards before returning
    let box: { l: number; t: number; r: number; b: number } | null = null;
    let lastBox = 0;

    const stage = stageRef.current;
    const onEnter = () => { hovered = true; };
    const onLeave = () => { hovered = false; pointerRef.current.on = false; hoveredIdxRef.current = -1; };
    const onMove = (e: MouseEvent) => {
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;
      pointerRef.current.on = true;
    };
    stage?.addEventListener('mouseenter', onEnter);
    stage?.addEventListener('mouseleave', onLeave);
    stage?.addEventListener('mousemove', onMove);

    const loop = (now: number) => {
      const st = useSceneStore.getState();
      const bs = useBoardStore.getState();
      const stg = stageRef.current;
      if (!stg) { raf = requestAnimationFrame(loop); return; }

      const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0; // ignore tab-away gaps
      lastNow = now;

      const n = bs.count;
      const cardScope = bs.motionOn && bs.hoverPlay && bs.hoverScope === 'card';

      const total = Math.max(1, Math.round(st.duration * st.fps));
      const template = getTemplate(st.activeTemplateId);
      const ease = resolveEasing(st.easing);
      const ctx = {
        fps: st.fps,
        width: stg.offsetWidth,
        height: stg.offsetHeight,
        duration: st.duration,
        totalFrames: total,
        ease,
        easedPhase: (p: number) => { const b = Math.floor(p); return b + ease(p - b); },
      };
      const values = { ...st.values, count: n };

      let frame = st.frame;              // board-scope path drives this
      let motion: CollectionFrame | null = null;     // scene 1 output
      let liftMotion: CollectionFrame | null = null; // scene 2 output

      if (cardScope) {
        // Refresh the cards' union box on a throttle, then test the pointer
        // against it grown by MARGIN. onBoard stays true while the pointer is
        // over any card + margin; false once it leaves that whole area.
        if (now - lastBox > 100) {
          lastBox = now;
          let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
          for (let i = 0; i < n; i++) {
            const el = cardsRef.current[i];
            if (!el) continue;
            const q = el.getBoundingClientRect();
            if (q.left < l) l = q.left;
            if (q.top < t) t = q.top;
            if (q.right > r) r = q.right;
            if (q.bottom > b) b = q.bottom;
          }
          box = r >= l ? { l, t, r, b } : null;
        }
        const p = pointerRef.current;
        const onBoard = p.on && !!box &&
          p.x >= box.l - MARGIN && p.x <= box.r + MARGIN &&
          p.y >= box.t - MARGIN && p.y <= box.b + MARGIN;

        // Advance the pure interaction layers. The pointer is reduced to a focus
        // card + whether it is still over the cards' area; each layer owns state.
        const input = { focus: hoveredIdxRef.current, onBoard, dt };
        motion = collection.update(input, {
          count: n,
          radius: Math.max(0, bs.hoverRadius),
          side: bs.hoverSide,
          rampMs: bs.hoverMs,
          speed: (values as any).speed ?? 1,
          duration: st.duration,
          fps: st.fps,
        });
        if (bs.liftOn) {
          liftMotion = lift.update(input, {
            count: n,
            rampMs: bs.hoverMs,
            speed: (values as any).speed ?? 1,
            duration: st.duration,
            fps: st.fps,
          });
        } else {
          lift.reset();
        }
      } else {
        collection.reset();
        lift.reset();
        // Board-scope hover → 1 while the pointer is over the board; else the
        // global play/pause. Ease toward it over hoverMs.
        const desired = bs.hoverPlay ? (hovered ? 1 : 0) : (st.playing ? 1 : 0);
        if (desired !== target) {
          target = desired;
          rampFrom = rate;
          rampStart = (bs.hoverPlay && bs.hoverMs > 0) ? now : 0;
          if (!rampStart) rate = desired;
        }
        if (rampStart) {
          const t = Math.min(1, (now - rampStart) / Math.max(1, bs.hoverMs));
          rate = rampFrom + (target - rampFrom) * ease(t);
          if (t >= 1) { rate = target; rampStart = 0; }
        }
        if (bs.motionOn && rate !== 0) {
          clock = (clock + dt * rate) % st.duration;
          frame = Math.floor(clock * st.fps) % total;
          if (frame !== st.frame) st.setFrame(frame);
        } else {
          clock = st.frame / st.fps; // stay in sync with the Timeline when idle
        }
      }

      // Scene 2: a Stack-01 "up" lift, layered on the opened cards with the same
      // per-card timing as the spread, so it cascades with the same richness.
      const liftTemplate = getTemplate('stack-01');
      const liftValues = {
        direction: 'up',
        visible: 3,
        cardSize: (values as any).cardSize ?? 200,
        zoom: 100,
        perspective: 0,
        stagger: (values as any).stagger ?? 0.14,
        speed: (values as any).speed ?? 0.5, // match the spread's step so it opens/closes together
        offset: { x: 0, y: 0 },
      };

      const layers: MotionLayer[] = [];
      for (let i = 0; i < n; i++) {
        const el = cardsRef.current[i];
        if (!el) continue;
        layers.length = 0;
        if (motion) {
          const cm = motion.cards[i];
          // Scene 1 — the spread (active template, side-directed).
          layers.push({ template, values, frame: cm.frame, motionIndex: cm.slot, motionCount: motion.motionCount, weight: cm.weight, motionSign: motion.motionSign });
          // Scene 2 — the lift (Stack-01 up), keyed to the focused card.
          if (liftMotion) {
            const lm = liftMotion.cards[i];
            if (lm.weight > 0) layers.push({ template: liftTemplate, values: liftValues, frame: lm.frame, motionIndex: lm.slot, motionCount: liftMotion.motionCount, weight: lm.weight, motionSign: 1 });
          }
        } else {
          // Board-scope: the single active template over the whole deck.
          layers.push({ template, values, frame, motionIndex: i, motionCount: n, weight: 1, motionSign: 1 });
        }
        const pose = composedPoseLayers(bs.board, bs.perCard, i, n, ctx, bs.motionOn, layers, cardScope);
        applyCardPose(el, pose, i);
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      stage?.removeEventListener('mouseenter', onEnter);
      stage?.removeEventListener('mouseleave', onLeave);
      stage?.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div className="stage-wrap">
      <div className="board-stage" ref={stageRef}>
        <div
          className="board-frame"
          ref={frameRef}
          style={{ width: frameW, height: frameH }}
        >
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            ref={(el) => { cardsRef.current[i] = el; }}
            className="board-card"
          >
            <span className="board-card-num">{String(i + 1).padStart(2, '0')}</span>
            {/* Only this 56×56 hotspot triggers the card's hover. */}
            <span
              className="board-hotspot"
              onMouseEnter={() => { hoveredIdxRef.current = i; }}
              onMouseLeave={() => { if (hoveredIdxRef.current === i) hoveredIdxRef.current = -1; }}
            />
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
