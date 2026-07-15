'use client';

import { useRef, useState } from 'react';
import { useAnimatedRemoval } from '@/lib/useAnimatedRemoval';
import { useFlipList } from '@/lib/useFlipList';
import { useSceneStore } from '@/store/useSceneStore';

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

export default function AssetsPanel() {
  const assets = useSceneStore((s) => s.assets);
  const addAssets = useSceneStore((s) => s.addAssets);
  const removeAsset = useSceneStore((s) => s.removeAsset);
  const toggleAsset = useSceneStore((s) => s.toggleAsset);
  const reorderAssets = useSceneStore((s) => s.reorderAssets);
  const clearAssets = useSceneStore((s) => s.clearAssets);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const { isLeaving, requestRemoval } = useAnimatedRemoval(removeAsset);
  const { snapshot } = useFlipList(
    listRef,
    assets.map((asset) => asset.id).join('|'),
  );

  const ingest = (files: FileList | File[]) => {
    const items = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    if (items.length) addAssets(items);
  };

  return (
    <>
      <div className="section-head">
        <span className="eyebrow">Assets</span>
      </div>
      <div className="section-body">
        <div
          className={`dropzone ${dropActive ? 'over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(e) => { e.preventDefault(); setDropActive(false); ingest(e.dataTransfer.files); }}
        >
          Drop images or click to upload
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && ingest(e.target.files)} />
        </div>

        {assets.length > 0 && (
          <div className="asset-meta">
            <span>{assets.length} {assets.length === 1 ? 'Asset' : 'Assets'}</span>
            <span className="spacer" />
            <button className="link-btn" onClick={clearAssets}>Clear all</button>
          </div>
        )}

        <ul className="asset-list" ref={listRef}>
          {assets.map((a, i) => {
            const leaving = isLeaving(a.id);
            return (
              <li
                key={a.id}
                data-flip-id={a.id}
                className={`asset-item ${dragIdx === i ? 'dragging' : ''} ${leaving ? 'leaving' : ''}`}
                draggable={!leaving}
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== i) {
                    snapshot();
                    reorderAssets(dragIdx, i);
                  }
                  setDragIdx(null);
                }}
                onDragEnd={() => setDragIdx(null)}
              >
                <span className="asset-idx">{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="asset-thumb" src={a.url} alt={a.name} />
                <span className="asset-name" title={a.name}>{a.name}</span>
                <button className={`icon-btn ${a.visible ? '' : 'off'}`} title={a.visible ? 'Hide' : 'Show'} onClick={() => toggleAsset(a.id)}>
                  <EyeIcon off={!a.visible} />
                </button>
                <button className="icon-btn" title="Remove" onClick={() => requestRemoval(a.id)}>
                  <XIcon />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
