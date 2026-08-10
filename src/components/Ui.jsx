/* =====================================================================
   UI PRIMITIVES — the small pieces every view is built from. These
   replace the HTML-string helpers (chip / sbar / row) of the original.
   ===================================================================== */

export const Chip = ({ cls = 'm', children }) => <span className={`chip ${cls}`}>{children}</span>;

export const ScoreBar = ({ n }) => (
  <div className="sbar">
    <span className="n2 num">{n}</span>
    <div className="tk"><div className={`fl${n < 50 ? ' lo' : ''}`} style={{ width: `${n}%` }} /></div>
  </div>
);

/* A key/value line inside .kv. `v` may be any node; null or '' reads
   "not captured" so a gap is visible rather than silently blank. */
export const Row = ({ k, v, miss }) => (
  <div className="row">
    <span className="k">{k}</span>
    <span className={`v${miss ? ' miss' : ''}`}>{v == null || v === '' ? 'not captured' : v}</span>
  </div>
);

export const KV = ({ children }) => <div className="kv">{children}</div>;

export function Card({ title, hint, children, pad = true, className = '', style }) {
  return (
    <div className={`card ${className}`.trim()} style={style}>
      {title && (
        <div className="card-h">
          <h3>{title}</h3>
          {hint != null && <span className="hint">{hint}</span>}
        </div>
      )}
      {pad ? <div className="card-b">{children}</div> : children}
    </div>
  );
}

export const Banner = ({ kind = 'info', children, style }) => (
  <div className={`banner ${kind}`} style={style}>{children}</div>
);

export const Meter = ({ label, value, sub, cls, width }) => (
  <div className="mrow">
    <div className="t">
      <span>{label}{sub && <span className="sub2"> · {sub}</span>}</span>
      <b className="num">{value}</b>
    </div>
    <div className="meter"><i className={cls} style={{ width: `${width}%` }} /></div>
  </div>
);

export const Kpi = ({ label, value, sub, tone }) => (
  <div className="kpi">
    <div className="eyebrow">{label}</div>
    <div className={`v num${tone ? ' ' + tone : ''}`}>{value}</div>
    <div className="s">{sub}</div>
  </div>
);

export const Kpis = ({ children, className = 'kpis mb14' }) => <div className={className}>{children}</div>;

/* Horizontally scrollable table shell — wide tables scroll inside the
   card rather than pushing the page sideways. */
export const TableWrap = ({ children }) => <div className="tw">{children}</div>;

export const Timeline = ({ children }) => <ul className="tl">{children}</ul>;

export const Dot = ({ tone = '' }) => <span className={`dt ${tone}`.trim()} />;

/* Confidence percentages share one colour ramp across every view. */
export const confColor = (p) =>
  p >= 80 ? 'var(--gain)' : p >= 60 ? 'var(--warn)' : 'var(--block)';
export const confMeterCls = (p) => (p >= 80 ? 'g' : p >= 60 ? 'o' : 'r');
export const healthMeterCls = (p) => (p >= 60 ? 'g' : p >= 40 ? 'o' : 'r');
