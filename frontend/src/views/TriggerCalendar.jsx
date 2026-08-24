import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, Banner, Timeline } from '../components/Ui.jsx';
import { inr, nextFest } from '../lib/core.js';
import { triggerList } from '../lib/derived.js';

const kindTone = (k) => (k === 'money' ? 'g' : k === 'personal' ? 'm' : 'w');

function Box({ title, list, openCustomer }) {
  return (
    <Card title={title} hint={<span className="tabular-nums">{list.length}</span>}>
      <Timeline>
        {list.length ? list.slice(0, 14).map((x, i) => (
          <li key={i}
              className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer"
              onClick={() => openCustomer(x.c.id)}>
            <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs">{x.days === 0 ? 'today' : `${x.days}d`}</span>
            <span>
              <b>{x.c.name}</b> <Chip cls={kindTone(x.kind)}>{x.kind}</Chip><br />
              <span className="text-[11.5px]">{x.label}</span>
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
                {x.c._seg ? (
                  <>{x.c._project} · gain {inr(x.c._gain)} · <Chip cls={x.c._seg}>{x.c._seg}</Chip></>
                ) : (
                  <>{x.c.units?.[0]?.project} · <Chip cls="m">incomplete record</Chip></>
                )}
              </div>
            </span>
          </li>
        )) : (
          <li className="flex gap-2.5 py-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Nothing in this window.</span>
          </li>
        )}
      </Timeline>
    </Card>
  );
}

export default function TriggerCalendar() {
  const { base, incompleteRecords, openCustomer } = useApp();
  const t = triggerList(base, incompleteRecords);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Box title="Next 7 days" list={bk(0, 7)} openCustomer={openCustomer} />
        <Box title="8 – 30 days" list={bk(8, 30)} openCustomer={openCustomer} />
        <Box title="31 – 90 days" list={bk(31, 90)} openCustomer={openCustomer} />
      </div>
    </>
  );
}
