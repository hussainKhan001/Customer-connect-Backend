import { useApp } from '../context/AppContext.jsx';
import { Card, Kpi, Kpis, Banner } from '../components/Ui.jsx';
import { cr, fmtD, inr, psf, projByName } from '../lib/core.js';
import { unitCalc } from '../lib/derived.js';

const COMMISSION = 0.02;

export default function ExitRegister() {
  const { base, openCustomer } = useApp();

  const ex = base.filter((c) => c.status === 'EXITED');
  const rows = ex.map((c) => {
    const u = c.units.find((x) => x.exited);
    const uc = unitCalc(u);
    const askValue = u.saleable * projByName(u.project).resale;
    const soldValue = u.saleable * u.exitRate;
    return { c, u: uc, soldValue, askValue, gap: askValue - soldValue, comm: soldValue * COMMISSION };
  });

  const totComm = rows.reduce((s, r) => s + r.comm, 0);
  const totGap = rows.reduce((s, r) => s + r.gap, 0);
  const totSold = rows.reduce((s, r) => s + r.soldValue, 0);
  const askedToSell = base.filter((c) => c.statements.length && c.statements[0].askedToSell).length;

  return (
    <>
      <Kpis>
        <Kpi label="Owners who exited" value={ex.length} tone="r" sub="sold without you" />
        <Kpi label="Value transacted" value={`₹${cr(totSold).toFixed(2)} Cr`} sub="in your own projects" />
        <Kpi label="Commission foregone" value={inr(totComm)} tone="o" sub="at 2% — the cost of no resale desk" />
        <Kpi label="Sold below your assessed value" value={inr(totGap)} sub="the discount a broker sale costs your customer" />
        <Kpi label="Statement readers asking to sell" value={askedToSell} tone="r" sub="the next wave, if you have nowhere to send them" />
      </Kpis>

      <Banner kind="block">
        <b>The statement creates sellers as well as buyers.</b> {askedToSell} owners in the pilot cohort
        asked how to sell after reading their gain. With no exit desk they list with a broker, take a
        discount, and you lose the commission and the relationship at once. Build the desk before the next
        batch goes out — this register is what it would have earned.
      </Banner>

      <Card title="Exits recorded" hint="from registry searches, not customer disclosure" pad={false}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Owner</th><th>Unit</th><th className="r">Booked at</th><th className="r">Sold at</th>
                <th className="r">Our assessed rate</th><th className="r">Their gain</th>
                <th className="r">Commission foregone</th><th>Exited</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, u, comm }) => (
                <tr key={c.id} className="clk" onClick={() => openCustomer(c.id)}>
                  <td>
                    <div className="nmb">{c.name}</div>
                    <div className="sub2">{c.id} · {c.city}</div>
                  </td>
                  <td>{u.unit}<div className="sub2">{u.project} · {u.saleable} sq.ft.</div></td>
                  <td className="r num">{psf(u.rate)}</td>
                  <td className="r num">{psf(u.exitRate)}</td>
                  <td className="r num sub2">{psf(u.valueRate)}</td>
                  <td className="r num">{inr((u.exitRate - u.rate) * u.saleable)}</td>
                  <td className="r num" style={{ color: 'var(--orange-deep)', fontWeight: 700 }}>{inr(comm)}</td>
                  <td className="num">{fmtD(u.exitDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
