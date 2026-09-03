import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Card, Chip, Banner, TableWrap, BtnPrimary, rowActionCls } from '../../components/Ui.jsx';
import ValuationModal from '../../components/ValuationModal.jsx';
import ExitModal from '../../components/ExitModal.jsx';
import MilestonesModal from '../../components/MilestonesModal.jsx';
import CompleteRecordModal from '../../components/CompleteRecordModal.jsx';
import { fmtD, inr, inrF, psf } from '../../utils/core.js';
import { roll } from '../../utils/derived.js';

export default function MPortfolio({ c }) {
  const r = roll(c);
  const [valIdx, setValIdx] = useState(null);
  const [exitIdx, setExitIdx] = useState(null);
  const [milestoneIdx, setMilestoneIdx] = useState(null);
  const [completing, setCompleting] = useState(false);

  return (
    <>
      {c.incomplete && (
        <Banner kind="warn">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span>PAN and/or unit financials (area, rate, consideration, booking date) were never captured for this owner — that's why they show as ₹0 below. Fill them in to make this a fully scored record.</span>
            <BtnPrimary className="shrink-0" onClick={() => setCompleting(true)}>Complete record</BtnPrimary>
          </div>
        </Banner>
      )}

      <Card title="Units" hint="rollup across all three entities" pad={false}>
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Unit</th>
                <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Milestones</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Area</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Rate paid</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Consideration</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Paid</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Value today</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Gain</th>
                <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {r.all.map((u, idx) => (
                <tr key={u.unit} className={u.exited ? 'bg-red-50/40 dark:bg-red-900/10' : undefined}>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                    <b>{u.unit}</b>
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{u.project}<br />{u.entity}</div>
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-[10.5px] text-gray-400 dark:text-gray-500">
                    Booked {fmtD(u.bookDate)}<br />
                    Agreement {fmtD(u.agrDate)}<br />
                    Registry {u.regDate ? fmtD(u.regDate) : <span className="text-amber-600 dark:text-amber-400">pending</span>}<br />
                    Possession {u.possDate ? fmtD(u.possDate) : <span className="text-amber-600 dark:text-amber-400">pending</span>}
                    <button className={`${rowActionCls('primary')} mt-1.5`} onClick={() => setMilestoneIdx(idx)}>
                      <Pencil className="w-3 h-3" />Edit dates
                    </button>
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">
                    {u.saleable}
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500">carpet {u.carpet} · load {u.loading}%</div>
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">
                    {psf(u.rate)}
                    {!!u.discount && <div className="text-[10.5px] text-gray-400 dark:text-gray-500">less {inr(u.discount)}</div>}
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">{inrF(u.consideration)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">
                    {inrF(u.paid)}
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{u.paidPct.toFixed(0)}%{u.outstanding ? ' · due ' + inr(u.outstanding) : ''}</div>
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">
                    {u.exited ? '—' : inrF(u.currentValue)}
                    <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{u.exited ? 'sold' : psf(u.valueRate) + '/sq.ft.'}</div>
                  </td>
                  <td className={`px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums font-bold ${u.exited ? 'text-gray-400 dark:text-gray-500' : 'text-green-600 dark:text-green-400'}`}>
                    {u.exited ? inr((u.exitRate - u.rate) * u.saleable) : inr(u.gain)}
                    <div className="text-[10.5px] font-normal text-gray-400 dark:text-gray-500">{u.gainPct.toFixed(0)}% · {u.cagr.toFixed(1)}% p.a.</div>
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                    {u.exited ? <Chip cls="r">exited {fmtD(u.exitDate)}</Chip>
                      : u.valStale ? <Chip cls="w">valuation stale</Chip>
                      : u.regDate ? <Chip cls="g">registered</Chip>
                      : <Chip cls="w">registry pending</Chip>}
                    {!u.exited && (
                      <button className={`${rowActionCls('red')} mt-1.5`} onClick={() => setExitIdx(idx)}>
                        Mark exited
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {r.units.length > 1 && (
                <tr className="bg-gray-50 dark:bg-gray-900/40 font-bold">
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap" colSpan={4}>Rollup — {r.units.length} live units</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">{inrF(r.consideration)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">{inrF(r.paid)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">{inrF(r.value)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums text-green-600 dark:text-green-400">{inr(r.gain)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap" />
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <Card title="Valuation basis" hint="what makes the gain figure defensible">
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Project</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Our ask</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Recent resale</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Circle</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">We use</th>
                <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Note dated</th>
                <th className="text-left text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap">Basis</th>
                <th className="text-right text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap" />
              </tr>
            </thead>
            <tbody>
              {r.all.map((u, idx) => (
                <tr key={u.unit}>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">{u.project}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums text-[10.5px] text-gray-400 dark:text-gray-500">{psf(u.val.ask)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">{psf(u.val.resale)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums">{psf(u.val.circle)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right tabular-nums"><b>{psf(u.valueRate)}</b></td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">{fmtD(u.val.notedOn)} {u.valStale && <Chip cls="r">stale</Chip>}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-[10.5px] text-gray-400 dark:text-gray-500">{u.val.basis}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right">
                    <button className={rowActionCls('primary')} onClick={() => setValIdx(idx)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
          Value is taken at recent registered resale and floored at the circle rate. Your own ask price
          appears here for internal reference only and never reaches a customer statement — if a project's
          prices flatten, your own dashboard must not become the buyer's evidence against you.
        </div>
      </Card>

      {valIdx !== null && (
        <ValuationModal customer={c} unit={r.all[valIdx]} unitIndex={valIdx} onClose={() => setValIdx(null)} />
      )}
      {exitIdx !== null && (
        <ExitModal customer={c} unit={r.all[exitIdx]} unitIndex={exitIdx} onClose={() => setExitIdx(null)} />
      )}
      {milestoneIdx !== null && (
        <MilestonesModal customer={c} unit={r.all[milestoneIdx]} unitIndex={milestoneIdx} onClose={() => setMilestoneIdx(null)} />
      )}
      {completing && <CompleteRecordModal customer={c} onClose={() => setCompleting(false)} />}
    </>
  );
}
