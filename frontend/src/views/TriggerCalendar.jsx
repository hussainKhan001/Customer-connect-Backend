import { useApp } from '../context/AppContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Card, Chip, Banner, Timeline } from '../components/Ui.jsx';
import { inr, nextFest, addD, fmtDM, TODAY, initials } from '../lib/core.js';
import { triggerList } from '../lib/derived.js';

const kindTone = (k) => (k === 'money' ? 'g' : k === 'personal' ? 'm' : 'w');

function Box({ title, list, openCustomer }) {
  const { getThemeColor } = useTheme();
  return (
    <Card title={title} hint={<span className="tabular-nums">{list.length}</span>} pad={false}>
      <Timeline>
        {list.length ? list.slice(0, 14).map((x, i) => (
          <li key={i}
              className="flex items-start gap-3 px-3.5 py-3 border-b border-gray-100 dark:border-gray-700/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
              onClick={() => openCustomer(x.c.id)}>
            <div className="w-11 flex-shrink-0 text-center pt-0.5">
              <div className="text-[13px] font-bold text-gray-800 dark:text-gray-100 tabular-nums leading-tight">
                {x.days === 0 ? 'Today' : `${x.days}d`}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap">
                {fmtDM(addD(TODAY, x.days))}
              </div>
            </div>
            <div
              className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm"
              style={{ backgroundColor: getThemeColor() }}
            >
              {initials(x.c.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-[13px] text-gray-900 dark:text-white truncate">{x.c.name}</span>
                <Chip cls={kindTone(x.kind)}>{x.kind}</Chip>
              </div>
              <div className="text-[12px] text-gray-600 dark:text-gray-300 mt-0.5">{x.label}</div>
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                {x.c._seg ? (
                  <>{x.c._project} · gain {inr(x.c._gain)} <Chip cls={x.c._seg}>{x.c._seg}</Chip></>
                ) : (
                  <>{x.c.units?.[0]?.project} <Chip cls="m">incomplete record</Chip></>
                )}
              </div>
            </div>
          </li>
        )) : (
          <li className="px-3.5 py-4 text-[13px] text-gray-500 dark:text-gray-400">
            Nothing in this window.
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
