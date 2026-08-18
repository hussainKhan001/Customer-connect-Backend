import { useMemo } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, ScoreBar, TableWrap, btnGhost, confColor } from '../components/Ui.jsx';
import { cr, fmtD, inr, psf, PROJECTS, ENTITIES } from '../lib/core.js';
import { SEGLBL, STATUSLBL, segDisplay } from '../lib/derived.js';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';

const COLS = [
  ['name', 'Owner'], ['_project', 'Project / unit'], ['_book', 'Booked', 1], ['_held', 'Held', 1],
  ['_rate', 'Rate paid', 1], ['_vrate', 'Value today', 1], ['_gain', 'Unrealised gain', 1],
  ['_paidPct', 'Paid', 1], ['_conf', 'Conf.', 1], ['_total', 'Score', 1], ['_seg', 'Segment'],
];

const ROW_LIMIT = 120;

const SEG_OPTS = [{ value: '', label: 'All segments' }, ...['A', 'B', 'C', 'D'].map((k) => ({ value: k, label: SEGLBL[k] }))];
const STATUS_OPTS = [{ value: '', label: 'All statuses' }, ...Object.keys(STATUSLBL).map((k) => ({ value: k, label: STATUSLBL[k] }))];
const ENT_OPTS = [{ value: '', label: 'All entities' }, ...ENTITIES.map((e) => ({ value: e, label: e }))];
const PROJ_OPTS = [{ value: '', label: 'All projects' }, ...PROJECTS.map((p) => ({ value: p.name, label: p.name }))];

const th = (right) =>
  `text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors${right ? ' text-right' : ''}`;

const tdBase = 'px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 text-sm whitespace-nowrap';
const tdTop = `${tdBase} align-top`;
const tdMidR = `${tdBase} align-middle text-right tabular-nums`;

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
  const setSel = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <input
          type="text"
          placeholder="Search name, ID, unit, city"
          value={filters.q}
          onChange={set('q')}
          className="px-3 py-2 h-10 border rounded-md shadow-sm text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 w-56"
        />

        <ThemedSelect className="w-44" value={filters.seg} onChange={setSel('seg')} options={SEG_OPTS} placeholder="All segments" />
        <ThemedSelect className="w-44" value={filters.status} onChange={setSel('status')} options={STATUS_OPTS} placeholder="All statuses" />
        <ThemedSelect className="w-44" value={filters.ent} onChange={setSel('ent')} options={ENT_OPTS} placeholder="All entities" />
        <ThemedSelect className="w-52" value={filters.proj} onChange={setSel('proj')} options={PROJ_OPTS} placeholder="All projects" />

        <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={clearFilters}>Clear</button>

        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto tabular-nums">
          {rows.length} of {base.length} · ₹{cr(rows.reduce((s, c) => s + c._gain, 0)).toFixed(1)} Cr gain in view
        </span>
      </div>

      <Card pad={false} className="overflow-hidden">
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {COLS.map(([k, l, right]) => (
                  <th key={k}
                      className={`${th(right)}${sort.k === k ? ' text-primary-600 dark:text-primary-400' : ''}`}
                      onClick={() => toggleSort(k)}>
                    <span className={`inline-flex items-center gap-1 ${right ? 'flex-row-reverse' : ''}`}>
                      {l}
                      {sort.k === k && (sort.dir < 0 ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, ROW_LIMIT).map((c, i) => {
                const sd = segDisplay(c);
                return (
                  <tr
                    key={c.id}
                    className={`transition-colors cursor-pointer ${c._blocked ? 'bg-red-50/60 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : i % 2 ? 'bg-gray-50/50 dark:bg-gray-900/20 hover:bg-gray-100/70 dark:hover:bg-gray-700/40' : 'hover:bg-gray-100/70 dark:hover:bg-gray-700/40'}`}
                    onClick={() => openCustomer(c.id)}
                  >
                    <td className={tdTop}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">{c.name}</span>
                        {c._live > 1 && <Chip cls="m">{c._live} units</Chip>}
                      </div>
                      <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">{c.id} · {c.city}</div>
                    </td>
                    <td className={tdTop}>
                      <div className="font-medium text-gray-800 dark:text-gray-100">{c._project}</div>
                      <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">{c._unit} · {c.units[0].type} · {c.units[0].saleable} sq.ft.</div>
                    </td>
                    <td className={tdMidR}>{fmtD(c._book)}</td>
                    <td className={tdMidR}>{c._held.toFixed(1)} yr</td>
                    <td className={tdMidR}>{psf(c._rate)}</td>
                    <td className={tdMidR}>{psf(c._vrate)}</td>
                    <td className={`${tdMidR} font-bold text-green-600 dark:text-green-400`}>{inr(c._gain)}</td>
                    <td className={tdMidR}>{c._paidPct.toFixed(0)}%</td>
                    <td className={`${tdMidR} font-bold ${confColor(c._conf)}`}>{c._conf}%</td>
                    <td className={`${tdBase} align-middle text-right`}>
                      {c._blocked ? <span className="text-[10.5px] text-gray-400 dark:text-gray-500">—</span> : <ScoreBar n={c._total} />}
                    </td>
                    <td className={`${tdBase} align-middle`}><Chip cls={sd.cls}>{sd.t}</Chip></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      {rows.length > ROW_LIMIT && (
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2.5">
          Showing the first {ROW_LIMIT} rows. At 1,000 owners this paginates server-side.
        </div>
      )}
    </>
  );
}
