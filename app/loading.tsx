const Rows = ({ count = 4 }: { count?: number }) => (
  <div className="skeleton-rows">
    {Array.from({ length: count }, (_, index) => <span key={index} />)}
  </div>
);

export default function Loading() {
  return (
    <div className="app app-skeleton" aria-label="Loading editor" aria-busy="true">
      <aside className="card rail skeleton-rail"><span className="skeleton-logo" /><Rows count={5} /></aside>
      <section className="card templates skeleton-panel"><span className="skeleton-tabs" /><span className="skeleton-search" /><Rows count={7} /></section>
      <section className="card controls skeleton-panel"><span className="skeleton-title" /><Rows count={6} /></section>
      <main className="stage-col"><div className="skeleton-stage"><Rows count={3} /></div></main>
      <section className="card right skeleton-panel"><span className="skeleton-title" /><Rows count={6} /></section>
      <footer className="card bottom skeleton-timeline"><span /><span /><span className="wide" /><span /></footer>
    </div>
  );
}
