'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { templateList, templateGroups } from '@/templates';
import TemplateThumb from './TemplateThumb';

const Chevron = ({ dir = 'right' }: { dir?: 'right' | 'left' }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={dir === 'left' ? { transform: 'rotate(180deg)' } : undefined}>
    <path d="M4.5 2.5L8 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function TemplatesCard() {
  const activeTemplateId = useSceneStore((s) => s.activeTemplateId);
  const setActiveTemplate = useSceneStore((s) => s.setActiveTemplate);
  const [tab, setTab] = useState<'templates' | 'custom'>('templates');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rootScrollRef = useRef(0);
  const pendingScrollRef = useRef<number | null>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  useLayoutEffect(() => {
    const top = pendingScrollRef.current;
    if (top === null || !listRef.current) return;
    pendingScrollRef.current = null;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    listRef.current.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  }, [openGroup]);

  const openTemplateGroup = (name: string) => {
    rootScrollRef.current = listRef.current?.scrollTop ?? 0;
    pendingScrollRef.current = 0;
    setOpenGroup(name);
  };

  const closeTemplateGroup = () => {
    pendingScrollRef.current = rootScrollRef.current;
    setOpenGroup(null);
  };

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const matches = templateList.filter(
    (t) => t.meta.name.toLowerCase().includes(q) || t.meta.group.toLowerCase().includes(q)
  );
  const group = templateGroups.find((g) => g.group === openGroup);

  return (
    <section className="card templates">
      <div className="tpl-head">
        <div className="tabs">
          <button className={`tab ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Templates</button>
          <button className={`tab ${tab === 'custom' ? 'active' : ''}`} onClick={() => setTab('custom')}>Custom</button>
        </div>

        <div className="searchbox">
          <span className="ico">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </span>
          <input ref={searchRef} placeholder={`Search ${templateList.length} templates`} value={query} onChange={(e) => setQuery(e.target.value)} />
          <span className="kbd-chip">⌘K</span>
        </div>
      </div>

      <div ref={listRef} className="tpl-list">
        {tab === 'custom' ? (
          <div className="tpl-group-label">No custom presets yet</div>
        ) : searching ? (
          // flat results across all groups while searching
          <div className="tpl-grid">
            {matches.map((t) => (
              <button
                key={t.meta.id}
                className={`tpl-card ${activeTemplateId === t.meta.id ? 'active' : ''}`}
                onClick={() => setActiveTemplate(t.meta.id)}
              >
                <TemplateThumb template={t} />
                <span className="tpl-card-label">{t.meta.name}</span>
              </button>
            ))}
          </div>
        ) : group ? (
          // drill-in: back header + 2-col variant grid
          <>
            <div className="tpl-group-head">
              <button className="tpl-back" onClick={closeTemplateGroup} aria-label="Back to template groups">
                <Chevron dir="left" />
              </button>
              <span className="tpl-group-title">{group.group}</span>
            </div>
            <div className="tpl-grid">
              {group.items.map((t) => (
                <button
                  key={t.meta.id}
                  className={`tpl-card ${activeTemplateId === t.meta.id ? 'active' : ''}`}
                  onClick={() => setActiveTemplate(t.meta.id)}
                >
                  <TemplateThumb template={t} />
                  <span className="tpl-card-label">{t.meta.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          // root: group rows
          <>
            {templateGroups.map(({ group: name, items }) => {
              const activeHere = items.some((t) => t.meta.id === activeTemplateId);
              return (
                <button
                  key={name}
                  className={`tpl-item ${activeHere ? 'active' : ''}`}
                  onClick={() => openTemplateGroup(name)}
                >
                  <span className="tpl-name">{name}</span>
                  <Chevron />
                </button>
              );
            })}
          </>
        )}
      </div>

      <div className="tpl-foot">
        <button className="btn full">Save as custom</button>
      </div>
    </section>
  );
}
