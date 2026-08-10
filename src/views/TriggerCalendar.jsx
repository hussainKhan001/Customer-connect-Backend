import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, Banner, Timeline } from '../components/Ui.jsx';
import { inr, nextFest } from '../lib/core.js';
import { triggerList } from '../lib/derived.js';

const kindTone = (k) => (k === 'money' ? 'g' : k === 'personal' ? 'm' : 'w');

function Box({ title, list, openCustomer }) {
  return (
    <Card title={title} hint={<span className="num">{list.length}</span>}>
      <div style={{ margin: '-10px 0' }}>
        <Timeline>
          {list.length ? list.slice(0, 14).map((x, i) => (
            <li key={i} className="clk" style={{ cursor: 'pointer' }} onClick={() => openCustomer(x.c.id)}>
              <span className="d num">{x.days === 0 ? 'today' : `${x.days}d`}</span>
              <span className="t">
                <b>{x.c.name}</b> <Chip cls={kindTone(x.kind)}>{x.kind}</Chip><br />
                <span style={{ fontSize: 11.5 }}>{x.label}</span>
                <div className="sub2">
                  {x.c._project} · gain {inr(x.c._gain)} · <Chip cls={x.c._seg}>{x.c._seg}</Chip>
                </div>
              </span>
            </li>
          )) : <li><span className="t">Nothing in this window.</span></li>}
        </Timeline>
      </div>
    </Card>
  );
}

export default function TriggerCalendar() {
  const { base, openCustomer } = useApp();
  const t = triggerList(base);
  const nf = nextFest();
  const bk = (lo, hi) => t.filter((x) => x.days >= lo && x.days <= hi);
  const blocked = base.filter((c) => c._blocked).length;

  return (
    <>
      <Banner kind="info">
        <b>Gate applied.</b> {blocked} owners are removed from every list on this page — exited, in
        transfer, in litigation, with an open complaint, without marketing consent, or sitting on a stale
        valuation note. They receive nothing until the block clears, and they return automatically when it
        does.{nf && <> Next auspicious window: <b>{nf.n}</b>, {nf.days} days out.</>}
      </Banner>

      <div className="grid g3">
        <Box title="Next 7 days" list={bk(0, 7)} openCustomer={openCustomer} />
        <Box title="8 – 30 days" list={bk(8, 30)} openCustomer={openCustomer} />
        <Box title="31 – 90 days" list={bk(31, 90)} openCustomer={openCustomer} />
      </div>
    </>
  );
}
