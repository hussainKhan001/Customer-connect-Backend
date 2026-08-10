import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, Banner } from '../components/Ui.jsx';
import { fmtD, daysTo, psf, PROJECTS, VAL_STALE_DAYS } from '../lib/core.js';

export default function ValuationRegister() {
  const { base } = useApp();
  const anyStale = PROJECTS.some((p) => daysTo(p.noted) < -VAL_STALE_DAYS);

  return (
    <>
      <Banner kind={anyStale ? 'warn' : 'good'}>
        <b>Every gain figure in this system traces to one of these notes.</b> There is no market data feed
        for Gwalior, so the note is the evidence — the registered resales it is built on, the date, and the
        named person who signed it. A note older than 90 days automatically holds every owner in that
        project out of all outreach, because a gain figure computed on stale evidence should not reach a
        customer.
      </Banner>

      <Card pad={false}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Project</th><th>Entity</th><th className="r">Launch rate</th><th className="r">Our ask</th>
                <th className="r">Recent resale</th><th className="r">Circle rate</th><th className="r">System uses</th>
                <th>Noted on</th><th>Signed by</th><th>Basis</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {PROJECTS.map((p) => {
                const stale = daysTo(p.noted) < -VAL_STALE_DAYS;
                const n = base.filter((c) => c.units.some((u) => u.project === p.name)).length;
                return (
                  <tr key={p.code}>
                    <td>
                      <b>{p.name}</b>
                      <div className="sub2">{n} owners · launched {p.launch}</div>
                    </td>
                    <td className="sub2">{p.entity}</td>
                    <td className="r num sub2">{psf(p.lr)}</td>
                    <td className="r num sub2">{psf(p.ask)}</td>
                    <td className="r num">{psf(p.resale)}</td>
                    <td className="r num">{psf(p.circle)}</td>
                    <td className="r num"><b>{psf(Math.max(p.circle, p.resale))}</b></td>
                    <td className="num">
                      {fmtD(p.noted)}
                      <div className="sub2">{Math.abs(daysTo(p.noted))} days ago</div>
                    </td>
                    <td className="sub2">{p.by}</td>
                    <td className="sub2">{p.basis}</td>
                    <td>{stale ? <Chip cls="r">stale — owners held</Chip> : <Chip cls="g">current</Chip>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Valuation policy" hint="write this before the first statement">
        <ul className="rules" style={{ margin: 0, paddingLeft: 16 }}>
          <li><b>Value at registered resale, floored at circle rate.</b> Never your own ask price. If a
            project's prices flatten, your own dashboard must not become the buyer's evidence against you.</li>
          <li><b>Refreshed monthly, signed by a named person.</b> Unsigned numbers are indefensible the
            moment a customer challenges one.</li>
          <li><b>Record the transactions the note is built on.</b> Wildflower Township has no resale history
            yet, so it sits at circle rate — and that is the honest answer, not a gap to fill with an
            estimate.</li>
          <li><b>Thin evidence is disclosed, not smoothed.</b> The Statement rests on a single transaction.
            Either widen the window or say so on the note.</li>
          <li><b>Once you publish a number you have set a floor.</b> The day you start buying units back,
            every assessed value you have ever quoted becomes a negotiating position. Decide the policy
            before the first trade, not after the third argument.</li>
        </ul>
      </Card>
    </>
  );
}
