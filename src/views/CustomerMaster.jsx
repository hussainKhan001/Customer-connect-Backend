import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, Row, KV, Meter, confMeterCls } from '../components/Ui.jsx';
import { initials, inrF, fmtD } from '../lib/core.js';
import { roll, confidence, STATUSLBL, segDisplay } from '../lib/derived.js';

import MOverview from './master/MOverview.jsx';
import MPortfolio from './master/MPortfolio.jsx';
import MLedger from './master/MLedger.jsx';
import MRelationship from './master/MRelationship.jsx';
import MTriggers from './master/MTriggers.jsx';
import MDocuments from './master/MDocuments.jsx';
import MActivity from './master/MActivity.jsx';
import MGovernance from './master/MGovernance.jsx';

const CTABS = [
  ['overview', 'Overview'], ['portfolio', 'Portfolio'], ['ledger', 'Ledger'],
  ['relationship', 'Relationship'], ['triggers', 'Trigger dates'], ['documents', 'Documents'],
  ['activity', 'Activity log'], ['governance', 'Consent & gate'],
];

const TAB_VIEWS = {
  overview: MOverview, portfolio: MPortfolio, ledger: MLedger, relationship: MRelationship,
  triggers: MTriggers, documents: MDocuments, activity: MActivity, governance: MGovernance,
};

export default function CustomerMaster() {
  const { base, cid, setCid, tab, setTab, weights, openStatement } = useApp();

  /* land on the strongest Segment A record when nobody has been picked */
  const current = base.find((c) => c.id === cid) || base.find((c) => c._seg === 'A') || base[0];
  if (!current) return <div className="note">No owners on book.</div>;

  const c = current;
  const r = roll(c);
  const cf = confidence(c);
  const sd = segDisplay(c);
  const g = c._g;
  const s = c._s;
  const Tab = TAB_VIEWS[tab];

  return (
    <>
      <div className="chero">
        <div className="r1">
          <div className="av">{initials(c.name)}</div>
          <div>
            <h1 style={{ fontSize: 21 }}>{c.salutation} {c.name}</h1>
            <div className="chips">
              <Chip cls={sd.cls}>{sd.t}</Chip>
              <Chip cls={c.status === 'ACTIVE' ? 'g' : 'r'}>{STATUSLBL[c.status]}</Chip>
              {g.open ? <Chip cls="g">contact open</Chip> : <Chip cls="r">gate closed</Chip>}
              {c._live > 1 && <Chip cls="k">{c._live} units</Chip>}
              <Chip cls={cf.pct >= 80 ? 'g' : cf.pct >= 60 ? 'w' : 'r'}>data confidence {cf.pct}%</Chip>
            </div>
            <div className="note" style={{ marginTop: 5 }}>
              {c.id} · {c.city} · {c.captured.occ ? c.occupation : 'occupation not captured'} · {c.mobile}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <select
            style={{ width: 'auto', maxWidth: 280 }}
            value={c.id}
            onChange={(e) => { setCid(e.target.value); setTab('overview'); }}
          >
            {base.slice(0, 80).map((x) => (
              <option key={x.id} value={x.id}>{x.name} — {STATUSLBL[x.status]}</option>
            ))}
          </select>
        </div>

        <div className="strip">
          <div className="s">
            <div className="eyebrow">Units held</div>
            <div className="v num">
              {c._live}
              {c.units.length > c._live && (
                <span style={{ fontSize: 11, color: 'var(--muted)' }}> (+{c.units.length - c._live} exited)</span>
              )}
            </div>
          </div>
          <Strip label="Consideration" v={c._live ? inrF(r.consideration) : '—'} />
          <Strip label="Paid" v={c._live ? inrF(r.paid) : '—'} />
          <Strip label="Outstanding" v={c._live ? inrF(r.outstanding) : '—'} tone={r.outstanding > 0 ? 'o' : ''} />
          <Strip label="Value today" v={c._live ? inrF(r.value) : '—'} />
          <Strip label="Unrealised gain" v={c._live ? inrF(r.gain) : '—'} tone="g" />
          <Strip label="Propensity" v={g.open ? s.total : '—'} />
        </div>

        <div className="tabs">
          {CTABS.map(([k, l]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="cbody">
        <div className="crail"><Rail c={c} cf={cf} weights={weights} onStatement={() => openStatement(c.id)} /></div>
        <div className="cpane"><Tab c={c} /></div>
      </div>
    </>
  );
}

const Strip = ({ label, v, tone }) => (
  <div className="s">
    <div className="eyebrow">{label}</div>
    <div className={`v num${tone ? ' ' + tone : ''}`}>{v}</div>
  </div>
);

function Rail({ c, cf, weights, onStatement }) {
  const g = c._g;
  const s = c._s;
  const miss = [
    !c.captured.dob && 'date of birth',
    !c.captured.anniv && c.coApplicant && 'anniversary',
    !c.captured.occ && 'income band',
    !c.captured.addr && 'current address',
  ].filter(Boolean);

  return (
    <>
      <Card title="Identity">
        <KV>
          <Row k="Customer ID" v={c.id} />
          <Row k="PAN" v={c.pan} />
          <Row k="KYC completed" v={fmtD(c.kycDate)} />
          <Row
            k="Co-applicant"
            miss={!c.coApplicant}
            v={c.coApplicant ? (
              <>{c.coApplicant} <span className="sub2">({c.coRelation}{c.coOnAgreement ? ', on agreement' : ', not on agreement'})</span></>
            ) : null}
          />
          <Row k="Mobile" v={c.mobile} />
          <Row k="Community" v={c.community} />
          <Row k="Source" v={c.source} />
          <Row k="Referred by" v={c.referredBy ? c.referredBy.n : '—'} />
          <Row k="Address" v={c.captured.addr ? c.corrAddr : null} miss={!c.captured.addr} />
        </KV>
      </Card>

      <Card title="Data confidence" hint={<span className="num">{cf.pass}/{cf.total}</span>}>
        <Meter label="Ready to show the customer" value={`${cf.pct}%`} cls={confMeterCls(cf.pct)} width={cf.pct} />
        <div style={{ marginTop: 9 }}>
          {cf.checks.map(([l, ok]) => (
            <div key={l} style={{ display: 'flex', gap: 7, padding: '3px 0', fontSize: 11.5 }}>
              <span className={`dt ${ok ? 'g' : 'r'}`} style={{ marginTop: 5 }} />
              <span style={ok ? undefined : { color: 'var(--block)' }}>{l}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Propensity"
        hint={`${weights.capacity}/${weights.trust}/${weights.timing}/${weights.engagement}`}
      >
        {g.open ? (
          [['capacity', 'Capacity'], ['trust', 'Trust'], ['timing', 'Timing'], ['engagement', 'Engagement']]
            .map(([k, l]) => (
              <Meter key={k} label={l} value={Math.round(s[k])} cls={s[k] >= 65 ? 'o' : ''} width={s[k]} />
            ))
        ) : (
          <div className="note">
            Not scored. The gate is closed, so segment is set by rule. The score is meaningless until the
            block clears.
          </div>
        )}
      </Card>

      <Card title="Actions">
        <button className="btn orange full" disabled={!g.open} onClick={onStatement}>
          Generate portfolio statement
        </button>
        <button className="btn ghost full" disabled={!g.open}>Add to launch invite list</button>
        <button className="btn ghost full">Log a call</button>
        <button className="btn ghost full">Request profile update</button>
        {!g.open && (
          <div className="note" style={{ marginTop: 8, color: 'var(--block)' }}>
            Outbound disabled by the gate — enforced at send time as well as here.
          </div>
        )}
        {!!miss.length && (
          <div className="note" style={{ marginTop: 9, color: 'var(--warn)' }}>
            Missing: {miss.join(', ')}.
          </div>
        )}
      </Card>
    </>
  );
}
