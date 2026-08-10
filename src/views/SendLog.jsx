import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, Kpi, Kpis, Banner } from '../components/Ui.jsx';
import { D, fmtD, inr } from '../lib/core.js';

export default function SendLog() {
  const { base, openCustomer } = useApp();

  const sent = base.filter((c) => c.statements.length).map((c) => ({ c, s: c.statements[0] }));
  const n = sent.length;
  const pc = (k) => (n ? Math.round((sent.filter((x) => x.s[k]).length / n) * 100) : 0);
  const supp = base.filter((c) => c._blocked).length;
  const disputeRate = pc('disputed');

  return (
    <>
      <Kpis>
        <Kpi label="Statements sent" value={n} sub="pilot cohort" />
        <Kpi label="Opened" value={`${pc('opened')}%`} sub="WhatsApp PDF outperforms email" />
        <Kpi label="Profile completed" value={`${pc('profileDone')}%`} tone="g" sub="the fields you could not collect any other way" />
        <Kpi label="Asked about a new project" value={`${pc('askedNewProject')}%`} tone="o" sub="unprompted" />
        <Kpi label="Disputed a figure" value={`${disputeRate}%`} tone="r" sub="this number decides whether you scale" />
      </Kpis>

      <Banner kind={disputeRate > 10 ? 'block' : 'good'}>
        <b>{disputeRate}% dispute rate on {n} statements.</b>{' '}
        {disputeRate > 10
          ? 'Too high to scale. Every disputed figure is a customer auditing your ledger and finding it wrong — and a wrong number on a branded statement is far harder to walk back than a wrong number on a demand letter. Go back to reconciliation before sending another batch.'
          : 'Inside tolerance. Reconcile the disputes individually, then widen the next batch.'}{' '}
        Separately, <b>{pc('askedToSell')}% asked how to sell.</b> Without a resale desk those owners go to
        a broker and you lose the commission and the relationship — which is exactly what the exit register
        is already counting.
      </Banner>

      <Card title="Send history" hint={`${supp} records suppressed at send time by the gate`} pad={false}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Owner</th><th>Sent</th><th>Version</th><th>Channel</th>
                <th className="r">Gain shown</th><th>Opened</th><th>Profile</th><th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {sent.sort((a, b) => D(b.s.d) - D(a.s.d)).slice(0, 25).map(({ c, s }) => (
                <tr key={c.id} className="clk" onClick={() => openCustomer(c.id)}>
                  <td>
                    <div className="nmb">{c.name}</div>
                    <div className="sub2">{c.id} · {c._project}</div>
                  </td>
                  <td className="num">{fmtD(s.d)}</td>
                  <td><code>{s.v}</code></td>
                  <td className="sub2">{s.ch}</td>
                  <td className="r num">{inr(c._gain)}</td>
                  <td>{s.opened ? <Chip cls="g">yes</Chip> : <Chip cls="m">no</Chip>}</td>
                  <td>{s.profileDone ? <Chip cls="g">completed</Chip> : <Chip cls="m">pending</Chip>}</td>
                  <td>
                    {s.disputed ? <Chip cls="r">figure disputed</Chip>
                      : s.askedToSell ? <Chip cls="w">asked to sell</Chip>
                      : s.askedNewProject ? <Chip cls="A">asked about launch</Chip>
                      : <Chip cls="m">no reply</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Rules the send layer enforces">
        <ul className="rules" style={{ margin: 0, paddingLeft: 16 }}>
          <li><b>The gate is re-evaluated at send time, not at list-build time.</b> A complaint raised the
            morning of the send stops that statement.</li>
          <li><b>Every statement is versioned and archived exactly as the customer saw it.</b> When a figure
            is disputed you need to know what was on the page, not what the database says today.</li>
          <li><b>Statements go as PDF or image, never as a link.</b> Half your base will not open a link,
            and older buyers will not log in.</li>
          <li><b>Every message carries a withdrawal path.</b> DPDP requires it and it costs you nothing.</li>
          <li><b>A named person signs off every batch before it leaves.</b> At 50 that is possible. At
            1,000 it needs to be a sampling rule with a named auditor.</li>
        </ul>
      </Card>
    </>
  );
}
