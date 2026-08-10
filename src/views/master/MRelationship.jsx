import { Card, Chip, Banner, Row, KV, Timeline } from '../../components/Ui.jsx';
import { fmtD } from '../../lib/core.js';

export default function MRelationship({ c }) {
  const hasOpenRef = c.referrals.some((x) => x.status.startsWith('Open'));
  const avgClose = c.complaints.length
    ? Math.round(c.complaints.reduce((s, x) => s + x.days, 0) / c.complaints.length) + ' days'
    : '—';

  return (
    <div className="grid g2">
      <Card title="Referrals given" hint={c.referrals.length}>
        {c.referrals.length ? (
          <>
            <table>
              <tbody>
                {c.referrals.map((x, i) => (
                  <tr key={i}>
                    <td><b>{x.n}</b><div className="sub2">{fmtD(x.date)}</div></td>
                    <td className="r">
                      {x.status.startsWith('Booked') ? <Chip cls="g">booked</Chip>
                        : x.status.startsWith('Open') ? <Chip cls="w">open</Chip>
                        : <Chip cls="m">lost</Chip>}
                      <div className="sub2">{x.status}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasOpenRef && (
              <Banner kind="warn" style={{ margin: '12px 0 0' }}>
                <b>A referral is sitting unworked</b>, and nobody has gone back to the referrer either.
                That silence is what stops the next referral — close the loop even when the answer is no.
              </Banner>
            )}
          </>
        ) : <div className="note">No referrals given.</div>}

        {c.referredBy && (
          <div className="note" style={{ marginTop: 11 }}>
            This owner was introduced by <b>{c.referredBy.n}</b>.
          </div>
        )}
      </Card>

      <Card title="Service history">
        <KV>
          <Row k="NPS" miss={!c.nps}
               v={c.nps ? <>{c.nps}/10 <span className="sub2">({fmtD(c.npsDate)})</span></> : null} />
          <Row k="Open complaints" v={c.openComplaints.length
            ? <span style={{ color: 'var(--block)' }}>{c.openComplaints.length}</span>
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
          <div style={{ marginTop: 12 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Closed</div>
            <Timeline>
              {c.complaints.map((x, i) => (
                <li key={i}>
                  <span className="d num">{fmtD(x.raised)}</span>
                  <span className="t">{x.t}<div className="sub2">closed in {x.days} days</div></span>
                </li>
              ))}
            </Timeline>
          </div>
        )}
      </Card>
    </div>
  );
}
