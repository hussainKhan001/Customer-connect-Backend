import { useApp } from '../context/AppContext.jsx';
import { Card, Chip, Kpi, Kpis, Banner, ScoreBar, Timeline, Meter, healthMeterCls } from '../components/Ui.jsx';
import ValueByProject from '../components/ValueByProject.jsx';
import { cr, inr, annivIn, daysTo, nextFest, PROJECTS, VAL_STALE_DAYS } from '../lib/core.js';
import { GATE_ORDER, SEGLBL, SEGMETA, roll, triggerList } from '../lib/derived.js';
import { exceptions } from '../lib/intake.js';

/* Three of the six gate codes are things your own teams can close out; the other
   three are facts about the owner that no amount of service recovery changes. */
const CLEARABLE = new Set(['OPEN_COMPLAINT', 'NO_MARKETING_CONSENT', 'STALE_VALUATION']);

/* the three strongest dated reasons to pick up the phone today */
function whyNow(c) {
  const r = [];
  const rr = roll(c);
  if (rr.units.every((u) => u.loan.closed || u.loan.selfFunded)) r.push('loan closed');
  else if (rr.units.some((u) => u.loan.prepaid)) r.push('prepaying');
  if (c._held >= 2) r.push('LTCG clear');
  if (c.referrals.length >= 2) r.push(c.referrals.length + ' referrals given');
  if (c.captured.dob && annivIn(c.dob) <= 45) r.push('birthday in ' + annivIn(c.dob) + 'd');
  if (c._paidPct >= 99) r.push('fully paid');
  return r.slice(0, 3).join(' · ') || 'score-led';
}

const HEALTH_FIELDS = [
  ['Date of birth', 'dob'],
  ['Anniversary', 'anniv'],
  ["Children's DOB", 'kid'],
  ['Occupation / income band', 'occ'],
  ['Address current', 'addr'],
];

export default function CommandCentre() {
  const { base, openCustomer, openSegment, setView } = useApp();

  const tot = base.length;
  const live = base.filter((c) => c.status === 'ACTIVE');
  const inv = live.reduce((s, c) => s + c._consid, 0);
  const val = live.reduce((s, c) => s + c._value, 0);
  const gain = val - inv;
  const gainPct = (gain / inv) * 100;

  const segGain = (k) => base.filter((c) => c._seg === k).reduce((s, c) => s + c._gain, 0);
  const cnt = (k) => base.filter((c) => c._seg === k).length;

  const A = base.filter((c) => c._seg === 'A').sort((a, b) => b._total - a._total);
  const blk = base.filter((c) => c._blocked);
  const nf = nextFest();
  const ex = exceptions(base);
  const staleNotes = PROJECTS.filter((p) => daysTo(p.noted) < -VAL_STALE_DAYS);

  /* per gate code: how many owners, and how much unrealised gain is sitting behind it */
  const gateRows = GATE_ORDER.map(([code, label]) => {
    const hits = blk.filter((c) => c._g.code === code);
    return {
      code, label,
      n: hits.length,
      gain: hits.reduce((s, c) => s + c._gain, 0),
      clearable: CLEARABLE.has(code),
    };
  });
  const recoverable = gateRows.filter((r) => r.clearable).reduce((s, r) => s + r.gain, 0);
  const blockedGain = blk.reduce((s, c) => s + c._gain, 0);

  const sent = base.filter((c) => c.statements.length);
  const disputed = sent.filter((c) => c.statements[0].disputed).length;
  const noConsent = base.filter((c) => c.status === 'ACTIVE' && !c.consent.marketing).length;
  const exited = base.filter((c) => c.status === 'EXITED').length;
  const soon = triggerList(base).filter((t) => t.days <= 30).slice(0, 7);

  return (
    <>
      <Kpis>
        <Kpi label="Owners on book" value={tot}
             sub={`${live.length} active · ${tot - live.length} exited or in transfer`} />
        <Kpi label="Original consideration" value={`₹${cr(inv).toFixed(1)} Cr`} sub="what they paid us" />
        <Kpi label="Value held today" value={`₹${cr(val).toFixed(1)} Cr`} sub="at resale, floored at circle rate" />
        <Kpi label="Unrealised gain" value={`₹${cr(gain).toFixed(1)} Cr`} tone="g"
             sub={`${gainPct.toFixed(0)}% — and most of them have not been told`} />
        <Kpi label="Contact-blocked" value={blk.length} tone="r"
             sub={`${((blk.length / tot) * 100).toFixed(0)}% of the base · ₹${cr(blockedGain).toFixed(1)} Cr of gain locked`} />
      </Kpis>

      <div className="segs mb14">
        {['A', 'B', 'C', 'D'].map((k) => (
          <button key={k} className={`seg ${k}`} onClick={() => openSegment(k)}>
            <div className="l">{SEGLBL[k]}</div>
            <div className="n num">{cnt(k)}</div>
            <div className="gv num">{inr(segGain(k))} held</div>
            <div className="w">{SEGMETA[k].w}</div>
            <div className="o">{SEGMETA[k].o}</div>
          </button>
        ))}
      </div>

      <Card
        title="Segment A — call list"
        hint={`${A.length} owners holding ₹${cr(segGain('A')).toFixed(1)} Cr of unrealised gain`}
        pad={false}
        className="mb14"
      >
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Owner</th><th>Holding</th><th className="r">Paid</th>
                <th className="r">Gain</th><th className="r">Score</th><th>Why now</th>
              </tr>
            </thead>
            <tbody>
              {A.slice(0, 9).map((c) => (
                <tr key={c.id} className="clk" onClick={() => openCustomer(c.id)}>
                  <td>
                    <div className="nmb">{c.name}</div>
                    <div className="sub2">{c.city} · {c.occupation}</div>
                  </td>
                  <td>
                    {c._project}
                    <div className="sub2">{c._unit}{c._live > 1 ? ` +${c._live - 1} more` : ''}</div>
                  </td>
                  <td className="r num">{c._paidPct.toFixed(0)}%</td>
                  <td className="r num" style={{ color: 'var(--gain)', fontWeight: 700 }}>{inr(c._gain)}</td>
                  <td className="r"><ScoreBar n={c._total} /></td>
                  <td style={{ fontSize: 11 }}>{whyNow(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-b" style={{ borderTop: '1px solid var(--soft)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn ghost sm" onClick={() => openSegment('A')}>
            See all {A.length} in the owner base →
          </button>
          <span className="note" style={{ margin: 0 }}>
            Showing the top 9 by score. These calls are made personally — never handed to a telecaller.
          </span>
        </div>
      </Card>

      <div className="grid g2 mb14" style={{ gridTemplateColumns: '1.35fr 1fr' }}>
        <ValueByProject base={base} />

        <Card title="Why records are blocked" hint="gate order, first match wins">
          <table>
            <thead>
              <tr>
                <th>Block</th><th className="r">Owners</th><th className="r">Gain locked</th><th />
              </tr>
            </thead>
            <tbody>
              {gateRows.map((r) => (
                <tr key={r.code}>
                  <td>
                    {r.label}
                    <div className="sub2"><code>{r.code}</code></div>
                  </td>
                  <td className="r num">{r.n}</td>
                  <td className="r num" style={{ fontWeight: r.gain ? 700 : 400 }}>
                    {r.gain ? inr(r.gain) : <span className="sub2">—</span>}
                  </td>
                  <td className="r">
                    {r.clearable ? <Chip cls="w">clearable</Chip> : <Chip cls="m">structural</Chip>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Banner kind="ok" style={{ margin: '12px 0 0' }}>
            <b>₹{cr(recoverable).toFixed(1)} Cr of gain sits behind blocks your own teams can clear.</b>{' '}
            Close the complaints, capture consent at the next service touch, refresh the valuation notes,
            and those owners return to every outreach list automatically. The structural rows will not
            move, and should not be worked.
          </Banner>

          <div className="note" style={{ marginTop: 11 }}>
            The gate returns a machine-readable code so the send layer enforces it independently. A rule
            that lives only in the screen gets overridden by a keen RM with an Excel export.
          </div>
        </Card>
      </div>

      <div className="grid g3">
        <Card title="Next 30 days" hint="post-gate">
          <div style={{ margin: '-10px 0' }}>
            <Timeline>
              {soon.length ? soon.map((t, i) => (
                <li key={i} className="clk" style={{ cursor: 'pointer' }} onClick={() => openCustomer(t.c.id)}>
                  <span className="d num">{t.days === 0 ? 'today' : `in ${t.days}d`}</span>
                  <span className="t">
                    <b>{t.c.name}</b> — {t.label}
                    <div className="sub2">{t.c._project} · <Chip cls={t.c._seg}>{t.c._seg}</Chip></div>
                  </span>
                </li>
              )) : <li><span className="t">Nothing dated in the next 30 days.</span></li>}
            </Timeline>
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="btn ghost sm" onClick={() => setView('triggers')}>Open the trigger calendar →</button>
          </div>
        </Card>

        <Card title="Data health" hint="the real constraint">
          {HEALTH_FIELDS.map(([l, f]) => {
            const n = base.filter((c) => c.captured[f]).length;
            const p = Math.round((n / tot) * 100);
            return (
              <Meter key={f} label={l} value={`${p}%`} sub={`${n} of ${tot}`}
                     cls={healthMeterCls(p)} width={p} />
            );
          })}
          <Banner kind="ok" style={{ margin: '12px 0 0' }}>
            <b>Do not run a data-collection drive.</b> Nobody fills a form for their builder. They will
            complete a profile to unlock a statement telling them their flat has appreciated{' '}
            {gainPct.toFixed(0)}%. Ship the statement first; the fields follow.
          </Banner>
        </Card>

        <Card title="What needs your decision">
          <ul className="rules" style={{ margin: 0, paddingLeft: 16 }}>
            {!!ex.length && (
              <li><b>{ex.length} records are held in the exceptions queue</b> and cannot be shown to a
                customer until reconciled. Intake &amp; exceptions.</li>
            )}
            {!!staleNotes.length && (
              <li><b>{staleNotes.length} valuation note{staleNotes.length > 1 ? 's are' : ' is'} over 90
                days old</b>, holding {inr(gateRows.find((r) => r.code === 'STALE_VALUATION').gain)} of
                gain out of reach. Valuation register.</li>
            )}
            <li><b>{exited} owners sold without you.</b> You earned nothing on those trades. The exit
              register puts a number on the missing resale desk.</li>
            {!!disputed && (
              <li><b>{disputed} of {sent.length} statements sent were disputed on a figure.</b> That ratio
                decides whether you go to 1,000 or go back to the ledger.</li>
            )}
            <li><b>{noConsent} active owners have no marketing consent.</b> They are legally out of reach
              until the next service touch captures it.</li>
            {nf && (
              <li><b>{nf.n} is {nf.days} days out.</b> Statements should land three to four weeks before,
                not during.</li>
            )}
          </ul>
        </Card>
      </div>
    </>
  );
}
