import { useApp } from '../context/AppContext.jsx';
import { Card, Timeline } from '../components/Ui.jsx';
import RateLadder from '../components/RateLadder.jsx';
import { TODAY, fmtD, inr, inrF, psf } from '../lib/core.js';
import { roll } from '../lib/derived.js';

export default function PortfolioStatement() {
  const { base, stmtId, setStmtId } = useApp();

  /* the picker only ever offers owners the gate has cleared */
  const pool = base.filter((c) => !c._blocked && c._live).sort((a, b) => b._gain - a._gain);
  if (!pool.length) return <div className="note">No owner currently clears the gate for a statement.</div>;

  const picked = pool.find((c) => c.id === stmtId);
  const c = picked || pool[0];
  const r = roll(c);
  const u = r.units[0];
  const y = u.heldYrs.toFixed(1);
  const gainPct = (r.gain / r.consideration) * 100;
  const booked = c.referrals.filter((x) => x.status === 'Booked').length;

  return (
    <>
      <div className="filters">
        <select style={{ minWidth: 340 }} value={c.id} onChange={(e) => setStmtId(e.target.value)}>
          {pool.slice(0, 60).map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} — {x._project} {x._unit} — gain {inr(x._gain)}
            </option>
          ))}
        </select>
        <button className="btn ghost sm" onClick={() => window.print()}>Print / save as PDF</button>
        <span className="count">
          {base.filter((x) => x._blocked).length} blocked owners are excluded from this picker by design.
        </span>
      </div>

      <div className="stmt">
        <div className="stmt-h">
          <div className="dot" />
          <div>
            <h2>Your property, {y} years on</h2>
            <div className="s">{u.entity} · Owner portfolio statement · {fmtD(TODAY)}</div>
          </div>
        </div>

        <div className="stmt-b">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow">Prepared for</div>
              <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 3 }}>{c.salutation} {c.name}</div>
              <div className="sub2">{c.id} · {c.city}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="eyebrow">Your unit</div>
              <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 3 }}>{u.unit}</div>
              <div className="sub2">{u.project} · {u.type} · {u.saleable} sq.ft.</div>
            </div>
          </div>

          <div className="hg">
            <div className="l">What your home has gained since you booked it</div>
            <div className="big num">{inr(r.gain)}</div>
            <div className="sm num">
              {gainPct.toFixed(0)}% over {y} years · {u.cagr.toFixed(1)}% compounded each year
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 7 }}>
              Rate per sq.ft. — what you paid, what the market says today
            </div>
            <RateLadder u={u} labels={['You paid', 'Govt. circle', 'Recent resale']} />
          </div>

          <div className="sg">
            <div>
              <div className="l">You have paid</div>
              <div className="v num">{inrF(r.paid)}</div>
              <div className="sub2">{((r.paid / r.consideration) * 100).toFixed(0)}% of {inrF(r.consideration)}</div>
            </div>
            <div>
              <div className="l">Value today</div>
              <div className="v num">{inrF(r.value)}</div>
              <div className="sub2">at recent resale in {u.project}</div>
            </div>
            <div>
              <div className="l">Booked on</div>
              <div className="v num">{fmtD(u.bookDate)}</div>
              <div className="sub2">{u.regDate ? 'Registered ' + fmtD(u.regDate) : 'Registry pending'}</div>
            </div>
          </div>

          <div className="eyebrow" style={{ marginBottom: 8 }}>Your journey with us</div>
          <Timeline>
            <li>
              <span className="d num">{fmtD(u.bookDate)}</span>
              <span className="t">Booked {u.unit} at {psf(u.rate)} per sq.ft.</span>
            </li>
            {u.regDate && (
              <li><span className="d num">{fmtD(u.regDate)}</span><span className="t">Registry completed</span></li>
            )}
            {u.possDate && (
              <li><span className="d num">{fmtD(u.possDate)}</span><span className="t">Possession handed over</span></li>
            )}
            {!!booked && (
              <li>
                <span className="d num">—</span>
                <span className="t">
                  You introduced {booked} famil{booked > 1 ? 'ies' : 'y'} who now live here{' '}
                  <b style={{ color: 'var(--gain)' }}>Thank you</b>
                </span>
              </li>
            )}
            <li>
              <span className="d num">{fmtD(TODAY)}</span>
              <span className="t">
                Assessed value today <b className="num" style={{ color: 'var(--gain)' }}>{inrF(r.value)}</b>
              </span>
            </li>
          </Timeline>

          <div className="unlock">
            <h4>Get this every quarter — and unlock what sits underneath it</h4>
            <div style={{ fontSize: 11.5, color: '#7A4310' }}>
              Complete your owner profile once and we will send this statement four times a year, along with:
            </div>
            <ul>
              <li>First right on new launches at pre-launch rate, 72 hours before public opening</li>
              <li>Exchange programme — we assess and buy back your unit and set it against your next one</li>
              <li>Referral rewards when someone you introduce books with us</li>
            </ul>
            <div style={{ marginTop: 11, fontSize: 11, color: 'var(--muted)' }}>
              The profile asks for: date of birth · wedding anniversary · children's dates of birth ·
              occupation · who introduced you to Neoteric
            </div>
          </div>

          <div className="disc">
            Assessed value is derived from registered resale transactions in {u.project} over the last two
            quarters, floored at the prevailing government circle rate, per the valuation note dated{' '}
            {fmtD(u.val.notedOn)}. It is an indicative assessment of market value — not an offer, a
            guarantee, or a projection of future returns. Property values can fall as well as rise.{' '}
            {u.entity} · RERA registration numbers available on request.
          </div>
        </div>
      </div>

      <Card title="Why this page is the whole platform" style={{ maxWidth: 790, margin: '16px auto 0' }}>
        <div className="note">
          This single page does three jobs. It is a <b>loyalty product</b> no builder in Gwalior currently
          gives. It is a <b>data-capture mechanism</b> that fills your empty birthday and anniversary
          fields without one form-filling drive. And it is a <b>re-investment pitch</b> that reframes "the
          flat I bought" into "the investment that returned {gainPct.toFixed(0)}%". Ship this before
          anything else on the platform — and pilot on 50, not 1,000, because every statement is also an
          invitation to audit your own ledger.
        </div>
      </Card>
    </>
  );
}
