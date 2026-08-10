import { Card, Chip } from '../../components/Ui.jsx';
import { fmtD, inr, inrF, psf } from '../../lib/core.js';
import { roll } from '../../lib/derived.js';

export default function MPortfolio({ c }) {
  const r = roll(c);

  return (
    <>
      <Card title="Units" hint="rollup across all three entities" pad={false}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Unit</th><th>Milestones</th><th className="r">Area</th><th className="r">Rate paid</th>
                <th className="r">Consideration</th><th className="r">Paid</th><th className="r">Value today</th>
                <th className="r">Gain</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {r.all.map((u) => (
                <tr key={u.unit} style={u.exited ? { background: '#FAF7F7' } : undefined}>
                  <td>
                    <b>{u.unit}</b>
                    <div className="sub2">{u.project}<br />{u.entity}</div>
                  </td>
                  <td className="sub2">
                    Booked {fmtD(u.bookDate)}<br />
                    Agreement {fmtD(u.agrDate)}<br />
                    Registry {u.regDate ? fmtD(u.regDate) : <span style={{ color: 'var(--warn)' }}>pending</span>}<br />
                    Possession {u.possDate ? fmtD(u.possDate) : <span style={{ color: 'var(--warn)' }}>pending</span>}
                  </td>
                  <td className="r num">
                    {u.saleable}
                    <div className="sub2">carpet {u.carpet} · load {u.loading}%</div>
                  </td>
                  <td className="r num">
                    {psf(u.rate)}
                    {!!u.discount && <div className="sub2">less {inr(u.discount)}</div>}
                  </td>
                  <td className="r num">{inrF(u.consideration)}</td>
                  <td className="r num">
                    {inrF(u.paid)}
                    <div className="sub2">{u.paidPct.toFixed(0)}%{u.outstanding ? ' · due ' + inr(u.outstanding) : ''}</div>
                  </td>
                  <td className="r num">
                    {u.exited ? '—' : inrF(u.currentValue)}
                    <div className="sub2">{u.exited ? 'sold' : psf(u.valueRate) + '/sq.ft.'}</div>
                  </td>
                  <td className="r num" style={{ color: u.exited ? 'var(--muted)' : 'var(--gain)', fontWeight: 700 }}>
                    {u.exited ? inr((u.exitRate - u.rate) * u.saleable) : inr(u.gain)}
                    <div className="sub2">{u.gainPct.toFixed(0)}% · {u.cagr.toFixed(1)}% p.a.</div>
                  </td>
                  <td>
                    {u.exited ? <Chip cls="r">exited {fmtD(u.exitDate)}</Chip>
                      : u.valStale ? <Chip cls="w">valuation stale</Chip>
                      : u.regDate ? <Chip cls="g">registered</Chip>
                      : <Chip cls="w">registry pending</Chip>}
                  </td>
                </tr>
              ))}
              {r.units.length > 1 && (
                <tr style={{ background: '#F7F6F4', fontWeight: 700 }}>
                  <td colSpan={4}>Rollup — {r.units.length} live units</td>
                  <td className="r num">{inrF(r.consideration)}</td>
                  <td className="r num">{inrF(r.paid)}</td>
                  <td className="r num">{inrF(r.value)}</td>
                  <td className="r num" style={{ color: 'var(--gain)' }}>{inr(r.gain)}</td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Valuation basis" hint="what makes the gain figure defensible">
        <table>
          <thead>
            <tr>
              <th>Project</th><th className="r">Our ask</th><th className="r">Recent resale</th>
              <th className="r">Circle</th><th className="r">We use</th><th>Note dated</th><th>Basis</th>
            </tr>
          </thead>
          <tbody>
            {r.all.map((u) => (
              <tr key={u.unit}>
                <td>{u.project}</td>
                <td className="r num sub2">{psf(u.val.ask)}</td>
                <td className="r num">{psf(u.val.resale)}</td>
                <td className="r num">{psf(u.val.circle)}</td>
                <td className="r num"><b>{psf(u.valueRate)}</b></td>
                <td>{fmtD(u.val.notedOn)} {u.valStale && <Chip cls="r">stale</Chip>}</td>
                <td className="sub2">{u.val.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="note" style={{ marginTop: 11 }}>
          Value is taken at recent registered resale and floored at the circle rate. Your own ask price
          appears here for internal reference only and never reaches a customer statement — if a project's
          prices flatten, your own dashboard must not become the buyer's evidence against you.
        </div>
      </Card>
    </>
  );
}
