import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, ScoreBar, confColor } from '../components/Ui.jsx';
import { cr, fmtD, inr, psf, PROJECTS, ENTITIES } from '../lib/core.js';
import { SEGLBL, STATUSLBL, segDisplay } from '../lib/derived.js';

const COLS = [
  ['name', 'Owner'], ['_project', 'Project / unit'], ['_book', 'Booked', 1], ['_held', 'Held', 1],
  ['_rate', 'Rate paid', 1], ['_vrate', 'Value today', 1], ['_gain', 'Unrealised gain', 1],
  ['_paidPct', 'Paid', 1], ['_conf', 'Conf.', 1], ['_total', 'Score', 1], ['_seg', 'Segment'],
];

const ROW_LIMIT = 120;

export default function OwnerBase() {
  const { base, filters, setFilters, clearFilters, sort, toggleSort, openCustomer } = useApp();

  const rows = useMemo(() => {
    const f = filters;
    return base
      .filter((c) =>
        (!f.seg || c._seg === f.seg) &&
        (!f.proj || c.units.some((u) => u.project === f.proj)) &&
        (!f.ent || c.units.some((u) => u.entity === f.ent)) &&
        (!f.status || c.status === f.status) &&
        (!f.q || (c.name + c.id + c._unit + c.city).toLowerCase().includes(f.q.toLowerCase())))
      .sort((a, b) => {
        let x = a[sort.k], y = b[sort.k];
        if (x instanceof Date) { x = +x; y = +y; }
        if (typeof x === 'string') return x.localeCompare(y) * sort.dir;
        return (x - y) * sort.dir;
      });
  }, [base, filters, sort]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="filters">
        <input type="text" placeholder="Search name, ID, unit, city" value={filters.q} onChange={set('q')} />

        <select value={filters.seg} onChange={set('seg')}>
          <option value="">All segments</option>
          {['A', 'B', 'C', 'D'].map((k) => <option key={k} value={k}>{SEGLBL[k]}</option>)}
        </select>

        <select value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option>
          {Object.keys(STATUSLBL).map((k) => <option key={k} value={k}>{STATUSLBL[k]}</option>)}
        </select>

        <select value={filters.ent} onChange={set('ent')}>
          <option value="">All entities</option>
          {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>

        <select value={filters.proj} onChange={set('proj')}>
          <option value="">All projects</option>
          {PROJECTS.map((p) => <option key={p.code} value={p.name}>{p.name}</option>)}
        </select>

        <button className="btn ghost sm" onClick={clearFilters}>Clear</button>

        <span className="count num">
          {rows.length} of {base.length} · ₹{cr(rows.reduce((s, c) => s + c._gain, 0)).toFixed(1)} Cr gain in view
        </span>
      </div>

      <Card pad={false}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                {COLS.map(([k, l, right]) => (
                  <th key={k}
                      className={`srt${sort.k === k ? ' on' : ''}${right ? ' r' : ''}`}
                      onClick={() => toggleSort(k)}>
                    {l}{sort.k === k ? (sort.dir < 0 ? ' ↓' : ' ↑') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, ROW_LIMIT).map((c) => {
                const sd = segDisplay(c);
                return (
                  <tr key={c.id} className={`clk${c._blocked ? ' blk' : ''}`} onClick={() => openCustomer(c.id)}>
                    <td>
                      <div className="nmb">{c.name} {c._live > 1 && <Chip cls="m">{c._live} units</Chip>}</div>
                      <div className="sub2">{c.id} · {c.city}</div>
                    </td>
                    <td>
                      {c._project}
                      <div className="sub2">{c._unit} · {c.units[0].type} · {c.units[0].saleable} sq.ft.</div>
                    </td>
                    <td className="r num">{fmtD(c._book)}</td>
                    <td className="r num">{c._held.toFixed(1)} yr</td>
                    <td className="r num">{psf(c._rate)}</td>
                    <td className="r num">{psf(c._vrate)}</td>
                    <td className="r num" style={{ color: 'var(--gain)', fontWeight: 700 }}>{inr(c._gain)}</td>
                    <td className="r num">{c._paidPct.toFixed(0)}%</td>
                    <td className="r num" style={{ color: confColor(c._conf) }}>{c._conf}%</td>
                    <td className="r">{c._blocked ? <span className="sub2">—</span> : <ScoreBar n={c._total} />}</td>
                    <td><Chip cls={sd.cls}>{sd.t}</Chip></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {rows.length > ROW_LIMIT && (
        <div className="note" style={{ marginTop: 10 }}>
          Showing the first {ROW_LIMIT} rows. At 1,000 owners this paginates server-side.
        </div>
      )}
    </>
  );
}
