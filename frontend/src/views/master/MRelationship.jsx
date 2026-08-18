import { Card, Chip, Banner, Row, KV, Timeline, TableWrap } from '../../components/Ui.jsx';
import { fmtD } from '../../lib/core.js';

export default function MRelationship({ c }) {
  const hasOpenRef = c.referrals.some((x) => x.status.startsWith('Open'));
  const avgClose = c.complaints.length
    ? Math.round(c.complaints.reduce((s, x) => s + x.days, 0) / c.complaints.length) + ' days'
    : '—';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Referrals given" hint={c.referrals.length}>
        {c.referrals.length ? (
          <>
            <TableWrap>
              <table className="w-full border-collapse">
                <tbody>
                  {c.referrals.map((x, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap">
                        <b>{x.n}</b><div className="text-[10.5px] text-gray-400 dark:text-gray-500">{fmtD(x.date)}</div>
                      </td>
                      <td className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700/60 align-top text-sm whitespace-nowrap text-right">
                        {x.status.startsWith('Booked') ? <Chip cls="g">booked</Chip>
                          : x.status.startsWith('Open') ? <Chip cls="w">open</Chip>
                          : <Chip cls="m">lost</Chip>}
                        <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{x.status}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            {hasOpenRef && (
              <Banner kind="warn" style={{ margin: '12px 0 0' }}>
                <b>A referral is sitting unworked</b>, and nobody has gone back to the referrer either.
                That silence is what stops the next referral — close the loop even when the answer is no.
              </Banner>
            )}
          </>
        ) : <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">No referrals given.</div>}

        {c.referredBy && (
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-3">
            This owner was introduced by <b>{c.referredBy.n}</b>.
          </div>
        )}
      </Card>

      <Card title="Service history">
        <KV>
          <Row k="NPS" miss={!c.nps}
               v={c.nps ? <>{c.nps}/10 <span className="text-[10.5px] text-gray-400 dark:text-gray-500">({fmtD(c.npsDate)})</span></> : null} />
          <Row k="Open complaints" v={c.openComplaints.length
            ? <span className="text-red-600 dark:text-red-400">{c.openComplaints.length}</span>
            : '0'} />
          <Row k="Closed complaints" v={c.complaints.length} />
          <Row k="Average closure time" v={avgClose} />
          <Row k="Events attended" v={c.events.length} />
          <Row k="Site visits since booking" v={c.siteVisits} />
          <Row k="Portal" v={c.portalLast ? 'last seen ' + fmtD(c.portalLast) : 'never logged in'} />
        </KV>

        {c.openComplaints.map((o) => (
          <Banner key={o.ncr} kind="block" style={{ margin: '12px 0 0' }}>
            <b>{o.t}</b><br />
            Raised {fmtD(o.raised)} · ageing <b>{o.days} days</b> · {o.ncr} · owner {o.owner}
          </Banner>
        ))}

        {!!c.complaints.length && (
          <div className="mt-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">Closed</div>
            <Timeline>
              {c.complaints.map((x, i) => (
                <li key={i} className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
                  <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{fmtD(x.raised)}</span>
                  <span className="flex-1">{x.t}<div className="text-[10.5px] text-gray-400 dark:text-gray-500">closed in {x.days} days</div></span>
                </li>
              ))}
            </Timeline>
          </div>
        )}
      </Card>
    </div>
  );
}
