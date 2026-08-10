import { useApp } from '../context/AppContext.jsx';
import { Card } from '../components/Ui.jsx';
import { DEFAULT_W, TRUST_HEAVY_W } from '../lib/derived.js';

const PILLARS = [
  ['capacity', 'Capacity', 'Can they write the cheque'],
  ['trust', 'Trust', 'Should we even be talking'],
  ['timing', 'Timing', 'Is the window open now'],
  ['engagement', 'Engagement', 'Are they already an advocate'],
];

export default function ScoringEngine() {
  const { base, weights, setWeights } = useApp();
  const cnt = (k) => base.filter((c) => c._seg === k).length;

  return (
    <div className="grid g2" style={{ gridTemplateColumns: '1fr 1.1fr' }}>
      <Card title="Weights" hint="segments redraw live">
        {PILLARS.map(([k, l, d]) => (
          <div className="wt" key={k}>
            <div className="n2">{l}<div className="sub2" style={{ fontWeight: 400 }}>{d}</div></div>
            <input
              type="range" min="0" max="60" value={weights[k]} aria-label={`${l} weight`}
              onChange={(e) => setWeights((w) => ({ ...w, [k]: +e.target.value }))}
            />
            <div className="val num">{weights[k]}%</div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn sm" onClick={() => setWeights(DEFAULT_W)}>Reset to 40 / 25 / 20 / 15</button>
          <button className="btn ghost sm" onClick={() => setWeights(TRUST_HEAVY_W)}>Try trust-heavy</button>
        </div>

        <div className="segs" style={{ marginTop: 16 }}>
          {['A', 'B', 'C', 'D'].map((k) => (
            <div key={k} className={`seg ${k}`} style={{ cursor: 'default' }}>
              <div className="l">Segment {k}</div>
              <div className="n num">{cnt(k)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="What each pillar is made of">
        <div className="formula">
          <b>Capacity</b> = paid-up ratio (30) + loan-closure proximity (25) + unrealised gain quantum (25)
          + occupation band (20)<br />
          <b>Trust</b> = zero open complaints (35) + NPS (30) + payment discipline less cheque returns (25)
          + no litigation (10)<br />
          <b>Timing</b> = holding ≥ 24 months (30) + loan closed or prepaying (25) + life-stage trigger
          within 45 days (25) + festive window (20)<br />
          <b>Engagement</b> = referrals given (40) + events attended (30) + site visits and portal logins (30)
        </div>

        <div style={{ height: 13 }} />
        <h3 style={{ fontSize: 12.5, marginBottom: 8 }}>Rules the score cannot override</h3>
        <ul className="rules" style={{ margin: 0, paddingLeft: 16 }}>
          <li><b>The gate runs first, in fixed order.</b> Exited, transfer pending, litigation, open
            complaint, no consent, stale valuation. Any hit forces Segment C regardless of score.</li>
          <li><b>Segment A never goes to a telecaller.</b> These are ₹40 L to ₹1 Cr second purchases from
            people who already trust you. The CEO or GM calls personally, or nobody does.</li>
          <li><b>Segment D is not a failure bucket.</b> High trust, low capacity — the referral engine, and
            the programme is built for them, not for sales.</li>
          <li><b>Valuation is resale-led and floored at circle rate.</b> Never your own ask price.</li>
          <li><b>Weights are a hypothesis.</b> Re-fit them against actual second-purchase conversions after
            two quarters. Whatever you set today is a written, testable guess and nothing more.</li>
        </ul>
      </Card>
    </div>
  );
}
