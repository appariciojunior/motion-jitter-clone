'use client';

import { useState } from 'react';

const NAV = [
  { id: 'singles', label: 'Singles', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="12" y="6" width="5" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
  ) },
  { id: 'stock', label: 'Stock', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
  ) },
  { id: 'mockups', label: 'Mockups', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  ) },
  { id: 'reels', label: 'Reels', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M9 8l4 2-4 2V8z" fill="currentColor"/></svg>
  ) },
  { id: 'compress', label: 'Compress', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 4L4 8m0-4v4h4M12 16l4-4m0 4v-4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ) },
];

export default function IconRail() {
  const [active, setActive] = useState('singles');
  return (
    <aside className="card rail">
      <div className="rail-top">
        <div className="rail-logo">
          <svg width="42" height="19" viewBox="0 0 42 19" fill="none">
            <rect x="1" y="2" width="10" height="15" rx="2.5" fill="currentColor"/>
            <rect x="14" y="4.5" width="8" height="10" rx="2" fill="currentColor" opacity="0.55"/>
            <rect x="25" y="6.5" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3"/>
          </svg>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={`rail-item ${active === n.id ? 'active' : ''}`} onClick={() => setActive(n.id)}>
            <span className="rail-ico">{n.icon}</span>
            <span className="rail-label">{n.label}</span>
          </button>
        ))}
      </div>
      <div className="rail-bottom">
        <button className="rail-ghost" title="Notifications">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none"><path d="M10 3a5 5 0 00-5 5v3l-1.5 2.5h13L15 11V8a5 5 0 00-5-5zM8.5 16a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className="rail-ghost" title="More">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="5" cy="10" r="1.4" fill="currentColor"/><circle cx="10" cy="10" r="1.4" fill="currentColor"/><circle cx="15" cy="10" r="1.4" fill="currentColor"/></svg>
        </button>
        <div className="rail-avatar">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M4 17c0-3 3-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      </div>
    </aside>
  );
}
