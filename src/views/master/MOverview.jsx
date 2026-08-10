import { Card, Banner, Row, KV } from '../../components/Ui.jsx';
import RateLadder from '../../components/RateLadder.jsx';
import { inr, fmtD } from '../../lib/core.js';
import { roll, STATUSLBL } from '../../lib/derived.js';

const segNote = (seg) =>
  seg === 'A' ? 'this call is made by the CEO or GM personally, not by a telecaller.'
  : seg === 'D' ? 'no second-purchase capacity; work as a referral source.'
  : 'quarterly statement and event circuit until capacity or timing moves.';

const fixAction = (g, c) =>
  g.code === 'OPEN_COMPLAINT' ? 'Close ' + c.openComplaints[0].ncr
  : g.code === 'TRANSFER_IN_PROGRESS' ? 'Collect succession documents and nominee KYC'
  : g.code === 'NO_MARKETING_CONSENT' ? 'Seek marketing consent at next service touch'
  : g.code === 'STALE_VALUATION' ? 'Refresh the valuation note for this project'
  : 'Suppress from all lists';

const fixOwner = (g, c) =>
  g.code === 'OPEN_COMPLAINT' ? c.openComplaints[0].owner
  : g.code === 'TRANSFER_IN_PROGRESS' ? 'Legal'
  : g.code === 'STALE_VALUATION' ? 'Finance'
  : 'CRM';

export default function MOverview({ c }) {
  const g = c._g;
  const r = roll(c);

  return (
    <>
      {g.open ? (
        <Banner kind="ok">
          <b>Contact open.</b> {g.why} Segment {c._seg} — {segNote(c._seg)}
        </Banner>
      ) : (
        <Banner kind="block">
          <b>Do not contact.</b> <code style={{ background: '#fff' }}>{g.code}</code> {g.why}
        </Banner>
      )}

      {c.statusNote && (
        <Banner kind="warn">
          <b>{STATUSLBL[c.status]}{c.statusSince ? ', ' + fmtD(c.statusSince) : ''}.</b> {c.statusNote}
        </Banner>
      )}

      <div className="grid g2">
        <Card title="Position" hint={`${r.units.length} live unit${r.units.length === 1 ? '' : 's'}`}>
          {r.units.length ? r.units.map((u) => (
            <div key={u.unit} style={{ marginBottom: 15 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b>{u.unit}</b>
                <span className="sub2">{u.project} · {u.type} · {u.saleable} sq.ft.</span>
              </div>
              <RateLadder u={u} style={{ marginTop: 7 }} />
              <div className="num" style={{ marginTop: 8, fontSize: 19, fontWeight: 700, color: 'var(--gain)' }}>
                {inr(u.gain)}
                <span style={{ fontSize: 11.5, color: 'var(--muted2)', fontWeight: 400 }}>
                  {' '}· {u.gainPct.toFixed(0)}% over {u.heldYrs.toFixed(1)} yrs · {u.cagr.toFixed(1)}% p.a.
                </span>
              </div>
            </div>
          )) : <div className="note">No live units held.</div>}
        </Card>

        <Card title="Next action">
          {g.open ? (
            <>
              <KV>
                <Row k="Action" v={
                  c._seg === 'A' ? 'Personal call — CEO or GM'
                  : c._seg === 'D' ? 'Referral programme invite'
                  : 'Quarterly statement + event invite'} />
                <Row k="Owner" v="Rahul / GM Sales" />
                <Row k="Due" v="Within 14 days" />
                <Row k="Lead with" v={`${inr(r.gain)} unrealised gain`} />
                <Row k="Do not lead with" v="A discount" />
              </KV>
              <div className="note" style={{ marginTop: 11 }}>
                Every action here writes to the activity log. Without outcome data the four weights stay a
                guess and can never be re-fit against real second purchases.
              </div>
            </>
          ) : (
            <>
              <KV>
                <Row k="Action" v={fixAction(g, c)} />
                <Row k="Owner" v={fixOwner(g, c)} />
                <Row k="Sales may contact" v="No" />
              </KV>
              <div className="note" style={{ marginTop: 11 }}>
                This record returns to outreach lists automatically once the block clears. No manual
                re-entry, and no way for a keen RM to override it.
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
