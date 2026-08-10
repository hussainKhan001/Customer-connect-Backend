import { useMemo, useState } from 'react';
import { Card, Chip } from './Ui.jsx';
import { cr, inr, fmtD, daysTo, PROJECTS, VAL_STALE_DAYS } from '../lib/core.js';
import { unitCalc } from '../lib/derived.js';

/* Two series, so the palette is categorical and validated:
   #F97316 / #B91C1C — CVD ΔE 20.4 (deutan), normal-vision ΔE 21.0. Orange sits at
   2.8:1 on white, below the 3:1 mark floor, so every bar carries a visible value
   label and the card ships a table view. Neither is optional. */
const REACH = 'var(--orange)';
const BLOCK = 'var(--block)';

export default function ValueByProject({ base }) {
  const [table, setTable] = useState(false);
  const [tip, setTip] = useState(null);

  const rows = useMemo(() => {
    const m = new Map(PROJECTS.map((p) => [p.name, { p, owners: 0, reachable: 0, blocked: 0 }]));
    base.forEach((c) => {
      const counted = new Set();
      c.units.forEach((u) => {
        if (u.exited) return;
        const e = m.get(u.project);
        if (!e) return;
        const { gain } = unitCalc(u);
        if (c._blocked) e.blocked += gain; else e.reachable += gain;
        if (!counted.has(u.project)) { e.owners++; counted.add(u.project); }
      });
    });
    return [...m.values()]
      .map((e) => ({ ...e, total: e.reachable + e.blocked, stale: daysTo(e.p.noted) < -VAL_STALE_DAYS }))
      .sort((a, b) => b.total - a.total);
  }, [base]);

  const max = Math.max(...rows.map((r) => r.total), 1);
  const totReach = rows.reduce((s, r) => s + r.reachable, 0);
  const totBlocked = rows.reduce((s, r) => s + r.blocked, 0);
  const grand = totReach + totBlocked;

  /* The KPI above counts active owners only. This chart counts every live unit on
     the book. Two different totals for "unrealised gain" on one screen is a
     defect unless the difference is stated, so state it. */
  const activeGain = useMemo(
    () => base.filter((c) => c.status === 'ACTIVE').reduce((s, c) => s + c._gain, 0),
    [base],
  );
  const heldElsewhere = grand - activeGain;

  const move = (r) => (e) => {
    const box = e.currentTarget.closest('.chartwrap').getBoundingClientRect();
    setTip({ r, x: e.clientX - box.left, y: e.clientY - box.top });
  };

  return (
    <Card
      title="Where the value sits"
      hint={
        <button className="btn ghost sm" onClick={() => setTable((t) => !t)}>
          {table ? 'Show chart' : 'Show table'}
        </button>
      }
    >
      {table ? (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Project</th><th className="r">Owners</th><th className="r">Reachable now</th>
                <th className="r">Behind the gate</th><th className="r">Total gain</th>
                <th>Note dated</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.code}>
                  <td><b>{r.p.name}</b><div className="sub2">{r.p.entity}</div></td>
                  <td className="r num">{r.owners}</td>
                  <td className="r num">{inr(r.reachable)}</td>
                  <td className="r num" style={{ color: r.blocked ? 'var(--block)' : undefined }}>
                    {inr(r.blocked)}
                  </td>
                  <td className="r num"><b>{inr(r.total)}</b></td>
                  <td className="num sub2">{fmtD(r.p.noted)}</td>
                  <td>{r.stale ? <Chip cls="r">stale — owners held</Chip> : <Chip cls="g">current</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chartwrap">
          <div className="legend">
            <span><i style={{ background: REACH }} />Reachable now — ₹{cr(totReach).toFixed(1)} Cr</span>
            <span><i style={{ background: BLOCK }} />Behind the gate — ₹{cr(totBlocked).toFixed(1)} Cr</span>
          </div>

          {rows.map((r) => (
            <div
              key={r.p.code}
              className="vrow"
              onMouseMove={move(r)}
              onMouseLeave={() => setTip(null)}
            >
              <div className="vlab">
                {r.p.name}
                <div className="sub2">
                  {r.owners} owner{r.owners === 1 ? '' : 's'}
                  {r.stale && <> · <span style={{ color: 'var(--block)', fontWeight: 700 }}>stale</span></>}
                </div>
              </div>
              <div className="vplot">
                <div className="vtrack" style={{ width: `${(r.total / max) * 100}%` }}>
                  {r.reachable > 0 && <i className="v1" style={{ flex: r.reachable }} />}
                  {r.blocked > 0 && <i className="v2" style={{ flex: r.blocked }} />}
                </div>
              </div>
              <div className="vval num">{inr(r.total)}</div>
            </div>
          ))}

          {tip && (
            <div
              className="tip"
              style={{
                left: Math.min(tip.x + 14, 380),
                top: Math.max(tip.y - 12, 0),
              }}
            >
              <div className="hd">{tip.r.p.name}</div>
              <div className="tl2">
                <span><i className="sw" style={{ background: REACH }} />Reachable now</span>
                <b>{inr(tip.r.reachable)}</b>
              </div>
              <div className="tl2">
                <span><i className="sw" style={{ background: BLOCK }} />Behind the gate</span>
                <b>{inr(tip.r.blocked)}</b>
              </div>
              <div className="tl2" style={{ marginTop: 3 }}>
                <span>{tip.r.owners} owners</span><b>{inr(tip.r.total)}</b>
              </div>
              <div className="ft">
                {tip.r.stale
                  ? `Valuation note ${Math.abs(daysTo(tip.r.p.noted))} days old — every owner here is held.`
                  : `Valued at ${fmtD(tip.r.p.noted)} · ${tip.r.p.entity}`}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="note" style={{ marginTop: 11 }}>
        Unrealised gain on live units, by project, split by whether the owner may be contacted today.
        The red portion is value you hold but cannot act on — a stale valuation note alone holds every
        owner in that project, however clean their record is.
        {heldElsewhere > 0 && (
          <>
            {' '}<b>Basis:</b> ₹{cr(grand).toFixed(1)} Cr across every live unit on the book. The
            ₹{cr(activeGain).toFixed(1)} Cr headline above counts active owners only — the
            ₹{cr(heldElsewhere).toFixed(2)} Cr difference is units still held by owners in transfer or
            mid-exit.
          </>
        )}
      </div>
    </Card>
  );
}
