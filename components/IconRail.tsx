'use client';

import { useUIStore } from '@/store/useUIStore';

const NAV = [
  { id: 'library', label: 'Library', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
  ) },
  { id: '3d', label: '3D', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5L10 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M3.7 6.4L10 10l6.3-3.6M10 10v7.4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
  ) },
  { id: 'web', label: 'Web', icon: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7.5 6.5L4 10l3.5 3.5M12.5 6.5L16 10l-3.5 3.5M11 4.5l-2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ) },
];

export default function IconRail() {
  const active = useUIStore((s) => s.nav);
  const setActive = useUIStore((s) => s.setNav);
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
    </aside>
  );
}
