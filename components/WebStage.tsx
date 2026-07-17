'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useWebStore } from '@/store/useWebStore';
import { useSceneStore } from '@/store/useSceneStore';
import { compileSource } from '@/lib/webCompile';
import { selectorFor, resolveSelector } from '@/lib/domSelector';
import { asset } from '@/lib/paths';
import { getTemplate } from '@/templates';
import { resolveEasing } from '@/lib/easing';
import { poseFor, applyPose, clearPose } from '@/lib/webPose';

// ============================================================
//  WEB MODE STAGE (SPIKE)
//  Renders the user's pasted source inside an iframe and lets them click
//  elements to mark them as motion layers.
//
//  The iframe exists for CSS isolation: the user's stylesheet must not leak
//  into the studio chrome, and the studio's tokens must not leak into their
//  component. It is intentionally same-origin (no `sandbox` attribute) so the
//  parent can drive a React root into its document.
//
//  SECURITY — read before this grows past a spike: same-origin means the
//  pasted code runs with the app's full privileges (same localStorage, same
//  cookies, can reach into `window.parent`). That is fine while the only
//  person pasting code is the person running the app. If this panel ever
//  accepts source from anyone else, it must move to `sandbox="allow-scripts"`
//  (opaque origin) with the component bundled and shipped in over
//  postMessage, and selection events posted back out the same way.
// ============================================================

// The frame is a viewport, not a scrollable document: a template posing from
// the centre throws layers well outside the box (Runway sends a card to
// x ≈ ±500), and a document would answer that with scrollbars and a shifting
// origin. Clipping at the edge is what the 2D canvas does too.
const FRAME_CSS = `
  html, body { margin: 0; background: transparent; overflow: hidden; }
  [data-web-hover] { outline: 1px dashed rgba(0,229,255,0.55); outline-offset: 2px; cursor: pointer; }
  [data-web-sel]   { outline: 2px solid #00e5ff; outline-offset: 2px; }
`;

export default function WebStage() {
  const source = useWebStore((s) => s.source);
  const css = useWebStore((s) => s.css);
  const tailwind = useWebStore((s) => s.tailwind);
  const layoutMode = useWebStore((s) => s.layoutMode);
  const selected = useWebStore((s) => s.selected);
  const canvas = useWebStore((s) => s.canvas);
  const setMeasured = useWebStore((s) => s.setMeasured);
  const toggleSelected = useWebStore((s) => s.toggleSelected);
  const setCompileError = useWebStore((s) => s.setCompileError);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);
  const mountRef = useRef<HTMLElement | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null);
  // 'fit' scales the component down to the stage; a number is an explicit zoom.
  const [zoom, setZoom] = useState<'fit' | number>('fit');
  // The frame is sized by what the user's source actually renders — their root
  // carries its own width (a pasted Figma export is typically a fixed px box).
  // null until first measured; the frame fills the stage until then, which is
  // also the measuring width for fluid content.
  const [contentSize, setContentSize] = useState<{ w: number; h: number } | null>(null);
  const [measuring, setMeasuring] = useState(true);
  // The pose loop is started once and reads this live; it must not be torn
  // down and rebuilt on every measure.
  const measuringRef = useRef(true);
  measuringRef.current = measuring;

  // ---- compile (debounced by the caller re-rendering on store change) ----
  const compiled = useMemo(() => compileSource(source, React), [source]);

  // ---- the canvas ----
  // An explicit W×H wins over the measured one. It is the motion frame, the
  // preview viewport and the exported box, all the same number: the template
  // reads it as ctx.width/height, and the frame crops to it.
  const box = canvas ?? contentSize;
  const sized = !!box && (!!canvas || !measuring);

  // ---- zoom factor ----
  // Scale to fit, never up: a 1440-wide page shrinks into the stage, a small
  // component keeps its real size rather than being blown up.
  // stageSize is the border box; .web-stage's 16px inset is what the frame
  // measured against, so the usable area is that inset removed.
  const PAD = 32;
  const fitScale =
    box && stageSize
      ? Math.max(
          0.02, // a pathological component must never scale to nothing
          Math.min(1, (stageSize.w - PAD) / box.w, (stageSize.h - PAD) / box.h),
        )
      : 1;
  const scale = zoom === 'fit' ? fitScale : zoom;

  useEffect(() => {
    setCompileError(compiled.ok ? null : compiled.error);
  }, [compiled, setCompileError]);

  // ---- build the iframe document once ----
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const doc = frame.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write('<!doctype html><html><head></head><body><div id="mount"></div></body></html>');
    doc.close();

    const style = doc.createElement('style');
    style.id = 'web-frame-css';
    style.textContent = FRAME_CSS;
    doc.head.appendChild(style);

    const userStyle = doc.createElement('style');
    userStyle.id = 'web-user-css';
    doc.head.appendChild(userStyle);

    mountRef.current = doc.getElementById('mount');
    if (mountRef.current) rootRef.current = createRoot(mountRef.current);
    setFrameReady(true);

    return () => {
      // Unmount async — React forbids unmounting a root while rendering.
      const root = rootRef.current;
      rootRef.current = null;
      if (root) setTimeout(() => root.unmount(), 0);
    };
  }, []);

  // ---- user CSS ----
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const el = doc.getElementById('web-user-css');
    if (el) el.textContent = css;
  }, [css, frameReady]);

  // ---- Tailwind JIT (vendored browser build, see public/vendor) ----
  // It scans the frame document and keeps a <style> in sync via a
  // MutationObserver, so it picks up whatever React renders after it loads.
  // Toggling it off removes the script, but the styles it already generated
  // stay until the frame is rebuilt — hence the reload on the way back.
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc || !frameReady) return;
    const existing = doc.getElementById('web-tailwind');
    if (tailwind && !existing) {
      const s = doc.createElement('script');
      s.id = 'web-tailwind';
      s.src = asset('/vendor/tailwind-browser.js');
      doc.head.appendChild(s);
    } else if (!tailwind && existing) {
      existing.remove();
      doc.querySelectorAll('style[data-tailwind]').forEach((el) => el.remove());
    }
  }, [tailwind, frameReady]);

  // ---- render the compiled component ----
  useEffect(() => {
    if (!frameReady || !rootRef.current || !compiled.ok) return;
    if (compiled.kind === 'html') {
      rootRef.current.render(
        <div dangerouslySetInnerHTML={{ __html: compiled.html ?? '' }} />,
      );
      return;
    }
    const C = compiled.Component!;
    // A throw inside the user's component would take the studio down with it,
    // so it renders behind an error boundary that reports back to the panel.
    rootRef.current.render(
      <UserErrorBoundary onError={(m) => setCompileError(m)}>
        <C />
      </UserErrorBoundary>,
    );
  }, [compiled, frameReady, setCompileError]);

  // ---- click-to-select + hover affordance ----
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    const mount = mountRef.current;
    if (!doc || !mount || !frameReady) return;

    let hovered: Element | null = null;
    const setHover = (el: Element | null) => {
      if (hovered === el) return;
      hovered?.removeAttribute('data-web-hover');
      hovered = el;
      hovered?.setAttribute('data-web-hover', '');
    };

    const pick = (e: Event): Element | null => {
      const t = e.target as Element | null;
      if (!t || t === mount || !mount.contains(t)) return null;
      return t;
    };

    const onMove = (e: Event) => setHover(pick(e));
    const onLeave = () => setHover(null);

    // Capture phase + preventDefault so the user's own buttons and links
    // don't fire while they're marking elements.
    const onClick = (e: MouseEvent) => {
      const el = pick(e);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const sel = selectorFor(mount, el);
      if (sel) toggleSelected(sel);
    };

    doc.addEventListener('mouseover', onMove);
    doc.addEventListener('mouseleave', onLeave);
    doc.addEventListener('click', onClick, true);
    return () => {
      doc.removeEventListener('mouseover', onMove);
      doc.removeEventListener('mouseleave', onLeave);
      doc.removeEventListener('click', onClick, true);
      setHover(null);
    };
  }, [frameReady, toggleSelected]);

  // ---- paint the current selection ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !frameReady) return;
    // Re-derive from scratch each time; the tree may have re-rendered under us.
    mount.querySelectorAll('[data-web-sel]').forEach((el) => el.removeAttribute('data-web-sel'));
    for (const sel of selected) {
      resolveSelector(mount, sel)?.setAttribute('data-web-sel', '');
    }
  }, [selected, compiled, frameReady]);

  // ---- measure what the source renders, and size the frame to it ----
  // Two passes, because measuring and sizing fight each other: the frame has to
  // be at the stage's full width to read a fluid component's natural size, but
  // sizing it to a fixed component's box is the whole point. So `measuring`
  // pins the frame back to 100% while the reading is taken, then the result is
  // committed.
  //
  // It polls instead of reading once: the Tailwind JIT injects its stylesheet
  // after the first paint, and before it lands a `w-[1030px]` root still
  // measures as a full-width block. Two equal readings in a row means the
  // styles have settled. Zero-sized readings are skipped — posing in 'own' mode
  // pulls elements out of flow and can collapse the root, and that collapse is
  // not the component's size.
  // An explicit canvas is the answer — nothing to measure.
  useEffect(() => {
    if (!frameReady || !compiled.ok || canvas) return;
    setMeasuring(true);
  }, [compiled, frameReady, tailwind, css, canvas]);

  useEffect(() => {
    if (!measuring || !frameReady) return;
    const mount = mountRef.current;
    if (!mount) return;

    let tries = 0;
    let last: { w: number; h: number } | null = null;
    const read = () => {
      const root = mount.firstElementChild as HTMLElement | null;
      const r = root?.getBoundingClientRect();
      if (root && r && r.width >= 1 && r.height >= 1) {
        // scrollWidth/Height as well as the box: a root with no width of its
        // own is only as wide as the frame, while its children happily overflow
        // it (three 424px cards in an unsized flex row need 1320). The box
        // alone would measure the frame and crop the rest.
        const next = {
          w: Math.ceil(Math.max(r.width, root.scrollWidth)),
          h: Math.ceil(Math.max(r.height, root.scrollHeight)),
        };
        if (last && last.w === next.w && last.h === next.h) {
          setContentSize(next);
          setMeasured(next);        // the 'Auto' value the canvas fields show
          setMeasuring(false);
          return;
        }
        last = next;
      }
      if (++tries > 12) {           // ~1s, then take whatever we have
        if (last) { setContentSize(last); setMeasured(last); }
        setMeasuring(false);
        return;
      }
      timer = window.setTimeout(read, 80);
    };
    let timer = window.setTimeout(read, 80);
    return () => window.clearTimeout(timer);
  }, [measuring, frameReady, setMeasured]);

  // ---- zoom ----
  // The scale is applied to the mount *inside* the frame, not to the frame
  // element. Scaling the iframe itself renders correctly but breaks selection:
  // Chrome does not map pointer coordinates through an iframe's own CSS
  // transform, and a click aimed at an element's on-screen centre never
  // reaches it. A transform inside the document is an ordinary case the
  // browser hit-tests correctly, so the frame element stays axis-aligned at
  // its scaled pixel size and the mount carries the zoom.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !frameReady) return;
    if (!sized || !box) {
      mount.style.removeProperty('width');
      mount.style.removeProperty('height');
      mount.style.removeProperty('transform');
      mount.style.removeProperty('transform-origin');
      return;
    }
    mount.style.width = `${box.w}px`;
    mount.style.height = `${box.h}px`;
    mount.style.transform = `scale(${scale})`;
    mount.style.transformOrigin = 'top left';
  }, [box?.w, box?.h, sized, scale, frameReady]);

  // ---- track the stage box, so 'fit' can react to a collapsing sidebar ----
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: r.width, h: r.height });
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---- drive the clock and pose the marked elements ----
  // Mirrors PreviewStage's loop: it owns the frame counter while playing and
  // writes it back to the scene store, so the shared Timeline scrubs both
  // modes. The difference is what gets posed — elements instead of sprites.
  useEffect(() => {
    if (!frameReady) return;
    const mount = mountRef.current;
    if (!mount) return;

    let raf = 0;
    let posed: HTMLElement[] = [];

    // The clock is an accumulator rather than an anchor+elapsed calculation,
    // because the hover ramp makes the rate vary: time has to be integrated,
    // not derived from a fixed start point.
    let clock = 0;          // seconds into the clip
    let last = 0;           // previous rAF timestamp
    let rate = 1;           // current playback rate
    let rampFrom = 1;
    let rampTo = 1;
    let rampStart = 0;      // 0 = not ramping

    // Mirrors motion.js in the export: the same curve, the same duration, so
    // the preview is what the zip does.
    const rampTo_ = (v: number) => {
      const web = useWebStore.getState();
      if (rampTo === v && !rampStart) return;
      rampTo = v;
      rampFrom = rate;
      rampStart = web.hoverMs > 0 ? performance.now() : 0;
      if (!rampStart) rate = v;
    };
    const onEnter = () => { if (useWebStore.getState().hoverPause) rampTo_(0); };
    const onLeave = () => { if (useWebStore.getState().hoverPause) rampTo_(1); };
    mount.addEventListener('mouseenter', onEnter);
    mount.addEventListener('mouseleave', onLeave);

    const loop = (now: number) => {
      const st = useSceneStore.getState();
      const web = useWebStore.getState();

      // Hold off while the canvas is being measured. In 'own' mode the pose
      // makes the marked elements absolute, which collapses the root — measure
      // through that and the component's own size reads far too small (its
      // height came out 556 instead of 684 on the way back to Auto).
      if (measuringRef.current) {
        for (const el of posed) clearPose(el);
        posed = [];
        raf = requestAnimationFrame(loop);
        return;
      }

      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;  // ignore tab-away gaps
      last = now;

      if (rampStart) {
        const ease = resolveEasing(st.easing);
        const t = Math.min(1, (now - rampStart) / Math.max(1, web.hoverMs));
        rate = rampFrom + (rampTo - rampFrom) * ease(t);
        if (t >= 1) { rate = rampTo; rampStart = 0; }
      }
      if (!web.hoverPause && rate !== 1) { rate = 1; rampStart = 0; }

      const total = Math.max(1, Math.round(st.duration * st.fps));
      let frame = st.frame;
      if (st.playing) {
        clock = (clock + dt * rate) % st.duration;
        frame = Math.floor(clock * st.fps) % total;
        if (frame !== st.frame) st.setFrame(frame);
      } else {
        // Paused: the Timeline owns the frame, so follow it.
        clock = st.frame / st.fps;
      }

      const els = web.selected
        .map((sel) => resolveSelector(mount, sel) as HTMLElement | null)
        .filter((el): el is HTMLElement => !!el);

      // Anything that left the selection (or the tree) keeps its last pose
      // frozen unless it is explicitly reset.
      for (const el of posed) if (!els.includes(el)) clearPose(el);
      posed = els;

      if (els.length) {
        const template = getTemplate(st.activeTemplateId);
        const ease = resolveEasing(st.easing);
        // The template's frame is the mount box, not the 2D canvas: templates
        // read ctx.width/height to decide when a layer has left the frame.
        // offsetWidth/Height, not getBoundingClientRect: the mount carries the
        // zoom transform, and the template must reason in the component's own
        // coordinates, not in on-screen pixels.
        const ctx = {
          fps: st.fps,
          width: mount.offsetWidth,
          height: mount.offsetHeight,
          duration: st.duration,
          totalFrames: Math.max(1, Math.round(st.duration * st.fps)),
          ease,
          easedPhase: (p: number) => { const b = Math.floor(p); return b + ease(p - b); },
        };
        // Count is derived from the selection, not from the template's own
        // slider — the marked elements are the layers there are.
        const count = els.length;
        const values = { ...st.values, count };

        if (web.layoutMode === 'own') {
          mount.style.position = 'relative';
          mount.style.minHeight = '100%';
        } else {
          mount.style.removeProperty('position');
          mount.style.removeProperty('min-height');
        }

        els.forEach((el, i) => {
          applyPose(el, poseFor(template, web.layoutMode, frame, i, count, values, ctx), web.layoutMode, i);
        });
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      mount.removeEventListener('mouseenter', onEnter);
      mount.removeEventListener('mouseleave', onLeave);
      for (const el of posed) clearPose(el);
      mount.style.removeProperty('position');
      mount.style.removeProperty('min-height');
    };
  }, [frameReady]);

  // Switching layout mode or dropping a selection leaves stale inline styles
  // on elements the loop no longer touches; wipe the whole subtree once.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !frameReady) return;
    mount.querySelectorAll<HTMLElement>('*').forEach(clearPose);
  }, [layoutMode, compiled, frameReady]);

  return (
    <div className="web-stage" ref={stageRef}>
      {/* The frame carries the *scaled* pixel size; the scale itself lives on
          the mount inside it (see the zoom effect). */}
      <iframe
        ref={frameRef}
        className="web-frame"
        title="Component preview"
        style={
          sized && box
            ? { width: Math.ceil(box.w * scale), height: Math.ceil(box.h * scale) }
            : undefined
        }
      />

      {sized && box && (
        <div className="web-zoom">
          <span className="web-zoom-dims">
            {box.w} × {box.h}{canvas && <em> canvas</em>}
          </span>
          <button
            className={`web-zoom-btn ${zoom === 'fit' ? 'active' : ''}`}
            onClick={() => setZoom('fit')}
          >
            Fit
          </button>
          <button
            className={`web-zoom-btn ${zoom === 1 ? 'active' : ''}`}
            onClick={() => setZoom(1)}
          >
            100%
          </button>
          <span className="web-zoom-pct">{Math.round(scale * 100)}%</span>
        </div>
      )}

      {!compiled.ok && <div className="web-error">{compiled.error}</div>}
    </div>
  );
}

// ---------- error boundary for user code ----------
class UserErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (m: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: Error) {
    this.props.onError(`Render error: ${e.message}`);
  }
  componentDidUpdate(prev: { children: React.ReactNode }) {
    // A new component arrived — give it a clean shot.
    if (prev.children !== this.props.children && this.state.failed) {
      this.setState({ failed: false });
    }
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
