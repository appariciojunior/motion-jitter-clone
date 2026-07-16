'use client';

import { useRef, useState } from 'react';
import { useSceneStore, type AssetItem } from '@/store/useSceneStore';
import { getTemplate } from '@/templates';
import { CARD_SHAPES, DEFAULT_FOCUS, type CropFocus } from '@/lib/crop';

const SHAPE_OPTIONS = ['auto', ...Object.keys(CARD_SHAPES)];

const EyeIcon = ({ off }: { off?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
    {off && <path d="M2.5 13.5l11-11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>}
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
);

const CropIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 1.5v10.5h10.5M1.5 4H12v10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

// 3×3 focal-point picker: images cover-fill their card without stretching;
// the focus chooses which part survives the crop.
const FOCUS_CELLS: CropFocus[] = [0, 0.5, 1].flatMap((y) => [0, 0.5, 1].map((x) => ({ x, y })));

function CropPopover({ asset, onClose }: { asset: AssetItem; onClose: () => void }) {
  const setAssetCrop = useSceneStore((s) => s.setAssetCrop);
  const setAllAssetCrops = useSceneStore((s) => s.setAllAssetCrops);
  const focus = asset.crop ?? DEFAULT_FOCUS;
  return (
    <>
      <div className="crop-scrim" onClick={onClose} />
      <div className="crop-pop" onPointerDown={(e) => e.stopPropagation()}>
        <span className="crop-pop-title">Crop focus</span>
        <div className="crop-grid">
          {FOCUS_CELLS.map((c) => (
            <button
              key={`${c.x}-${c.y}`}
              className={`crop-cell ${focus.x === c.x && focus.y === c.y ? 'active' : ''}`}
              title={`${['Left','Centre','Right'][c.x * 2]} / ${['Top','Middle','Bottom'][c.y * 2]}`}
              onClick={() => setAssetCrop(asset.id, c)}
            />
          ))}
        </div>
        <button className="link-btn" onClick={() => { setAllAssetCrops(focus); onClose(); }}>
          Apply to all images
        </button>
      </div>
    </>
  );
}

export default function AssetsPanel() {
  const assets = useSceneStore((s) => s.assets);
  const count = useSceneStore((s) => Math.max(1, Math.round(s.values.count ?? 1)));
  const repeat = useSceneStore((s) => getTemplate(s.activeTemplateId).meta.repeatAssets === true);
  const addAssets = useSceneStore((s) => s.addAssets);
  const replaceAssetAt = useSceneStore((s) => s.replaceAssetAt);
  const removeAsset = useSceneStore((s) => s.removeAsset);
  const toggleAsset = useSceneStore((s) => s.toggleAsset);
  const reorderAssets = useSceneStore((s) => s.reorderAssets);
  const clearAssets = useSceneStore((s) => s.clearAssets);
  const cardShape = useSceneStore((s) => s.cardShape);
  const setCardShape = useSceneStore((s) => s.setCardShape);
  const fullBleed = useSceneStore((s) => getTemplate(s.activeTemplateId).meta.cardAspect === 'canvas');
  const inputRef = useRef<HTMLInputElement>(null);
  const slotInputRef = useRef<HTMLInputElement>(null);
  const slotTarget = useRef<number>(0);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [cropOpenId, setCropOpenId] = useState<string | null>(null);
  // Pointer-based row drag (HTML5 DnD is unreliable: img elements hijack the
  // drag and re-renders can cancel it). Drag arms after a 4px move so plain
  // clicks (replace / hide / remove) keep working.
  const drag = useRef<{ idx: number; startY: number; active: boolean } | null>(null);

  const rowIndexAt = (x: number, y: number): number | null => {
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot-idx]');
    return row ? Number(row.dataset.slotIdx) : null;
  };

  const onRowPointerDown = (e: React.PointerEvent<HTMLLIElement>, i: number) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return; // eye / remove clicks
    e.preventDefault(); // stop native image drag + text selection
    drag.current = { idx: i, startY: e.clientY, active: false };
  };

  const onRowPointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.active) {
      if (Math.abs(e.clientY - d.startY) < 4) return;
      d.active = true;
      setDragIdx(d.idx);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const over = rowIndexAt(e.clientX, e.clientY);
    setOverIdx(over !== null && over !== d.idx ? over : null);
  };

  const onRowPointerUp = (e: React.PointerEvent<HTMLLIElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    const over = rowIndexAt(e.clientX, e.clientY);
    if (over !== null && over !== d.idx) {
      // dropping past the filled range (an empty slot) moves the card to the end
      reorderAssets(d.idx, Math.min(over, filled - 1));
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  const onRowPointerCancel = () => {
    drag.current = null;
    setDragIdx(null);
    setOverIdx(null);
  };

  const ingest = (files: FileList | File[]) => {
    const items = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    if (items.length) addAssets(items);
  };

  const openSlotPicker = (index: number) => {
    slotTarget.current = index;
    slotInputRef.current?.click();
  };

  // The list is sized by the template's `count` — one row per layer slot.
  // Repeat-mode templates cycle a small image set across many layers, so the
  // panel shows just the images plus one add-row instead of `count` slots.
  const filled = Math.min(assets.length, count);
  const rows = repeat ? Math.min(count, assets.length + 1) : count;
  const slots = Array.from({ length: rows }, (_, i) => assets[i] ?? null);

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Assets</span>
        <span className="badge">{filled}/{count}</span>
      </div>
      <div className="section-body">
        <div
          className={`dropzone ${dropActive ? 'over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => { e.preventDefault(); setDropActive(false); ingest(e.dataTransfer.files); }}
        >
          {repeat ? 'Drop images — a few are enough, they repeat' : `Drop images or click to fill ${count} ${count === 1 ? 'slot' : 'slots'}`}
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && ingest(e.target.files)} />
        </div>

        <div className="asset-meta">
          <span>
            {repeat
              ? `${assets.length || 'your'} image${assets.length === 1 ? '' : 's'} repeat across ${count} layers`
              : `${count} ${count === 1 ? 'slot' : 'slots'} · linked to Count`}
          </span>
          <span className="spacer" />
          {assets.length > 0 && <button className="link-btn" onClick={clearAssets}>Clear all</button>}
        </div>

        {/* card shape — the cover-crop aspect every card adapts to */}
        <div className="asset-meta">
          <span>Card shape</span>
        </div>
        {fullBleed ? (
          <div className="asset-meta"><span className="asset-name-empty">Full-bleed template — cards match the canvas</span></div>
        ) : (
          <div className="pills shape-pills">
            {SHAPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`pill ${cardShape === opt ? 'active' : ''}`}
                onClick={() => setCardShape(opt)}
              >
                {opt === 'auto' ? 'Auto' : opt}
              </button>
            ))}
          </div>
        )}

        {/* hidden picker for empty-slot uploads */}
        <input
          ref={slotInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) replaceAssetAt(slotTarget.current, { name: f.name, url: URL.createObjectURL(f) });
            e.target.value = '';
          }}
        />

        <ul className="asset-list">
          {slots.map((a, i) =>
            a ? (
              <li
                key={a.id}
                data-slot-idx={i}
                className={`asset-item ${dragIdx === i ? 'dragging' : ''} ${overIdx === i && dragIdx !== null && dragIdx !== i ? 'drop-target' : ''}`}
                onPointerDown={(e) => onRowPointerDown(e, i)}
                onPointerMove={onRowPointerMove}
                onPointerUp={onRowPointerUp}
                onPointerCancel={onRowPointerCancel}
              >
                <span className="asset-idx">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="asset-thumb" src={a.url} alt={a.name} onClick={() => openSlotPicker(i)} title="Replace" />
                <span className="asset-name" title={a.name}>{a.name}</span>
                <button
                  className={`icon-btn ${a.crop && (a.crop.x !== 0.5 || a.crop.y !== 0.5) ? 'crop-set' : ''}`}
                  title="Crop focus"
                  onClick={() => setCropOpenId(cropOpenId === a.id ? null : a.id)}
                >
                  <CropIcon />
                </button>
                <button className={`icon-btn ${a.visible ? '' : 'off'}`} title={a.visible ? 'Hide' : 'Show'} onClick={() => toggleAsset(a.id)}>
                  <EyeIcon off={!a.visible} />
                </button>
                <button className="icon-btn" title="Remove" onClick={() => removeAsset(a.id)}>
                  <XIcon />
                </button>
                {cropOpenId === a.id && <CropPopover asset={a} onClose={() => setCropOpenId(null)} />}
              </li>
            ) : (
              <li
                key={`empty-${i}`}
                data-slot-idx={i}
                className={`asset-item asset-empty ${overIdx === i && dragIdx !== null ? 'drop-target' : ''}`}
                onClick={() => openSlotPicker(i)}
              >
                <span className="asset-idx">{i + 1}</span>
                <span className="asset-thumb asset-thumb-empty">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                </span>
                <span className="asset-name asset-name-empty">
                  {assets.length > 0 ? `Repeats image ${(i % assets.length) + 1} — click to override` : 'Empty slot — add image'}
                </span>
              </li>
            )
          )}
        </ul>
      </div>
    </>
  );
}
