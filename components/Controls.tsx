'use client';

import { useRef, useState } from 'react';
import type { ControlDef } from '@/lib/types';

interface RowProps {
  def: ControlDef;
  value: any;
  onChange: (val: any) => void;
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
  const trackRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const num = Number(value);
  const pct = Math.max(0, Math.min(100, ((num - min) / (max - min)) * 100));
  const decimals = step < 1 ? 1 : 0;

  const setFromX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const snapped = Math.round((min + t * (max - min)) / step) * step;
    onChange(Number(Math.max(min, Math.min(max, snapped)).toFixed(4)));
  };

  return (
    <div
      ref={trackRef}
      className="strack"
      onPointerDown={(e) => {
        if (editing) return;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        setFromX(e.clientX);
      }}
      onPointerMove={(e) => { if (!editing && e.buttons === 1) setFromX(e.clientX); }}
      onDoubleClick={(e) => {
        // double-click resets to the control's declared default
        if (editing) return;
        if ((e.target as HTMLElement).closest('.sval, .sval-input')) return;
        const d = Number(def.default);
        if (Number.isFinite(d)) onChange(d);
      }}
      title="Double-click to reset"
    >
      <div className="sfill" style={{ width: `${pct}%` }} />
      <div className="shandle" style={{ left: `${pct}%` }} />
      {editing ? (
        <input
          className="sval-input"
          type="number"
          autoFocus
          min={min}
          max={max}
          step={step}
          defaultValue={Number(num.toFixed(decimals))}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => onChange(Number(e.target.value))}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
        />
      ) : (
        <span
          className="sval"
          onPointerDown={(e) => { e.stopPropagation(); setEditing(true); }}
        >
          {num.toFixed(decimals)}
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
  const v = value ?? { x: 0, y: 0 };

  const setFromEvent = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    onChange({ x: Math.round((nx * 2 - 1) * range), y: Math.round((ny * 2 - 1) * range) });
  };

  const dotX = ((v.x / range + 1) / 2) * 100;
  const dotY = ((v.y / range + 1) / 2) * 100;

  return (
    <div className="xypad-wrap">
      <div
        ref={ref}
        className="xypad"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setFromEvent(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (e.buttons === 1) setFromEvent(e.clientX, e.clientY); }}
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
