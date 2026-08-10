import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, Kpi, Kpis } from '../components/Ui.jsx';
import { cr, inr } from '../lib/core.js';

export default function ReferralTree() {
  const { base, openCustomer } = useApp();

  /* who introduced whom — one level of the graph per owner */
  const kids = {};
  base.forEach((c) => {
    if (c.referredBy) (kids[c.referredBy.id] = kids[c.referredBy.id] || []).push(c);
  });
  const byId = (id) => base.find((c) => c.id === id);
  const roots = Object.keys(kids).map(byId).filter(Boolean)
    .sort((a, b) => (kids[b.id] || []).length - (kids[a.id] || []).length);

  const referred = base.filter((c) => c.referredBy);
  const tot = referred.length;
  const val = referred.reduce((s, c) => s + c._consid, 0);
  const open = base.reduce((s, c) => s + c.referrals.filter((r) => r.status.startsWith('Open')).length, 0);
  const advocates = base.filter((c) => c._seg === 'D').length;

  const Branch = ({ c }) => {
    const k = kids[c.id] || [];
    return (
      <li>
        <span className="node clk" onClick={() => openCustomer(c.id)}>
          <b>{c.name}</b> <Chip cls={c._seg}>{c._seg}</Chip>
          <span className="sub2">{c._project} · {inr(c._consid)}</span>
        </span>
        {!!k.length && <ul>{k.map((x) => <Branch key={x.id} c={x} />)}</ul>}
      </li>
    );
  };

  return (
    <>
      <Kpis>
        <Kpi label="Came via another owner" value={tot} sub={`${((tot / base.length) * 100).toFixed(0)}% of the base`} />
        <Kpi label="Value written through referral" value={`₹${cr(val).toFixed(1)} Cr`} tone="o" sub="no marketing cost attached" />
        <Kpi label="Active referrers" value={roots.length} sub="the people carrying your pipeline" />
        <Kpi label="Referrals sitting unworked" value={open} tone="r" sub="handed to you and dropped" />
        <Kpi label="Segment D advocates" value={advocates} sub="cannot buy again — can still bring buyers" />
      </Kpis>

      <div className="grid g2" style={{ gridTemplateColumns: '1.25fr 1fr' }}>
        <Card title="Genealogy" hint="top referrers first · click any node" pad={false}>
          <div className="card-b tree">
            <ul>{roots.slice(0, 12).map((c) => <Branch key={c.id} c={c} />)}</ul>
          </div>
        </Card>

        <Card title="Programme design">
          <ul className="rules" style={{ margin: 0, paddingLeft: 16 }}>
            <li><b>Escalating slab, not flat.</b> 1st referral ₹X · 2nd ₹1.25X · 3rd onward ₹1.5X. A flat
              rate caps effort at one.</li>
            <li><b>Non-cash lane.</b> A doctor or a Class-I officer will not take a cheque. Gold coin, cafe
              hosting, launch-night invite. Note 194R applies to benefits in kind.</li>
            <li><b>Attribution before launch.</b> First tag wins, 90-day validity, disputes to AGM Sales.
              Write it now or arbitrate it later against your own DSAs.</li>
            <li><b>Close the loop.</b> {open} referred leads are sitting unworked and nobody went back to
              the referrer. That silence is what kills the second referral.</li>
            <li><b>Segment D is the referral engine.</b> High trust, no capacity. Stop treating them as a
              dead list.</li>
            <li><b>194H TDS applies to cash payouts.</b> Structure it before the first cheque, not after
              the first notice.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
