'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ControlDef } from '@/lib/types';
import { useSceneStore } from '@/store/useSceneStore';

interface RowProps {
  def: ControlDef;
  value: any;
  onChange: (val: any) => void;
}

function useRafBatchedChange<T>(onChange: (value: T) => void) {
  const callbackRef = useRef(onChange);
  const latestRef = useRef<T | null>(null);
  const frameRef = useRef(0);

  callbackRef.current = onChange;

  const flush = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    if (latestRef.current === null) return;
    const latest = latestRef.current;
    latestRef.current = null;
    callbackRef.current(latest);
  }, []);

  const schedule = useCallback((next: T) => {
    latestRef.current = next;
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(flush);
  }, [flush]);

  const cancel = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    latestRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  return { schedule, flush, cancel };
}

export function ControlRow({ def, value, onChange }: RowProps) {
  return (
    <div className="ctl-row">
      <label className="ctl-label">{def.label}</label>
      <div className="ctl-input">{renderControl(def, value, onChange)}</div>
    </div>
  );
}

function renderControl(def: ControlDef, value: any, onChange: (v: any) => void) {
  switch (def.type) {
    case 'slider': return <SliderControl def={def} value={value} onChange={onChange} />;
    case 'toggle': return <ToggleControl def={def} value={value} onChange={onChange} />;
    case 'pills': return <PillsControl def={def} value={value} onChange={onChange} />;
    case 'select': return <SelectControl def={def} value={value} onChange={onChange} />;
    case 'color': return <ColorControl value={value} onChange={onChange} />;
    case 'xypad': return <XYPadControl def={def} value={value} onChange={onChange} />;
    case 'upload': return <UploadControl value={value} onChange={onChange} />;
    case 'text': return <TextControl value={value} onChange={onChange} />;
    default: return null;
  }
}

// Figma spec: the whole 34px track is the slider. Fill #2d2d2d over #232323,
// a 2×16px #424242 bar as handle, value inside the track right-aligned
// (12px #aaa), click the value to type an exact number.
function SliderControl({ def, value, onChange }: RowProps) {
  const min = def.min ?? 0, max = def.max ?? 100, step = def.step ?? 1;
  const fps = useSceneStore((s) => s.fps);
  const trackRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewValue, setPreviewValue] = useState(Number(value));
  const change = useRafBatchedChange<number>(onChange);
  const num = dragging ? previewValue : Number(value);
  const displayScale = def.display === 'frames' ? fps : 1;
  const displayNum = num * displayScale;
  const displayMin = min * displayScale;
  const displayMax = max * displayScale;
  const displayStep = step * displayScale;
  const pct = Math.max(0, Math.min(100, ((num - min) / (max - min)) * 100));
  let decimals = 0;
  while (decimals < 3 && Math.abs(displayStep * (10 ** decimals) - Math.round(displayStep * (10 ** decimals))) > 1e-8) {
    decimals += 1;
  }

  useEffect(() => {
    if (!dragging) setPreviewValue(Number(value));
  }, [dragging, value]);

  const setFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const snapped = Math.round((min + t * (max - min)) / step) * step;
    const next = Number(Math.max(min, Math.min(max, snapped)).toFixed(4));
    setPreviewValue(next);
    change.schedule(next);
  };

  const finishDrag = (pointerId: number) => {
    change.flush();
    setDragging(false);
    if (trackRef.current?.hasPointerCapture(pointerId)) {
      trackRef.current.releasePointerCapture(pointerId);
    }
  };

  return (
    <div
      ref={trackRef}
      className={`strack ${dragging ? 'dragging' : ''}`}
      onPointerDown={(e) => {
        if (editing) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        setFromX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (!editing && e.currentTarget.hasPointerCapture(e.pointerId)) setFromX(e.clientX);
      }}
      onPointerUp={(e) => finishDrag(e.pointerId)}
      onPointerCancel={(e) => {
        change.cancel();
        setDragging(false);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      }}
    >
      <div className="sfill" style={{ width: `${pct}%` }} />
      <div className="shandle" style={{ left: `${pct}%` }} />
      {editing ? (
        <input
          className="sval-input"
          type="number"
          autoFocus
          min={displayMin}
          max={displayMax}
          step={displayStep}
          defaultValue={Number(displayNum.toFixed(decimals))}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => onChange(Number(e.target.value) / displayScale)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
        />
      ) : (
        <span
          className="sval"
          onPointerDown={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          {displayNum.toFixed(decimals)}{def.unit ?? ''}
        </span>
      )}
    </div>
  );
}

function ToggleControl({ def, value, onChange }: RowProps) {
  const options = def.options ?? ['on', 'off'];
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button key={opt} className={`seg ${value === opt ? 'active' : ''}`} onClick={() => onChange(opt)}>{opt}</button>
      ))}
    </div>
  );
}

function PillsControl({ def, value, onChange }: RowProps) {
  return (
    <div className="pills">
      {(def.options ?? []).map((opt) => (
        <button key={opt} className={`pill ${value === opt ? 'active' : ''}`} onClick={() => onChange(opt)}>{opt}</button>
      ))}
    </div>
  );
}

function SelectControl({ def, value, onChange }: RowProps) {
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {(def.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

function ColorControl({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div className="color">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input className="field" type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function XYPadControl({ def, value, onChange }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const range = def.max ?? 400;
  const [dragging, setDragging] = useState(false);
  const [previewValue, setPreviewValue] = useState(value ?? { x: 0, y: 0 });
  const change = useRafBatchedChange<{ x: number; y: number }>(onChange);
  const v = dragging ? previewValue : (value ?? { x: 0, y: 0 });

  useEffect(() => {
    if (!dragging) setPreviewValue(value ?? { x: 0, y: 0 });
  }, [dragging, value]);

  const setFromEvent = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const next = { x: Math.round((nx * 2 - 1) * range), y: Math.round((ny * 2 - 1) * range) };
    setPreviewValue(next);
    change.schedule(next);
  };

  const dotX = ((v.x / range + 1) / 2) * 100;
  const dotY = ((v.y / range + 1) / 2) * 100;

  return (
    <div className="xypad-wrap">
      <div
        ref={ref}
        className={`xypad ${dragging ? 'dragging' : ''}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          setFromEvent(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromEvent(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          change.flush();
          setDragging(false);
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={(e) => {
          change.cancel();
          setDragging(false);
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <div className="xypad-cross-h" />
        <div className="xypad-cross-v" />
        <div className="xypad-dot" style={{ left: `${dotX}%`, top: `${dotY}%` }} />
      </div>
      <div className="xypad-vals">{v.x}, {v.y}</div>
    </div>
  );
}

function UploadControl({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <label className="upload">
      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(URL.createObjectURL(f)); }} />
      <span>{value ? 'Replace file…' : 'Choose file…'}</span>
    </label>
  );
}

function TextControl({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return <input className="field" type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}
