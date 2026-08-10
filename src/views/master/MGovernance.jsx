import { Card, Chip, Banner, Row, KV, Timeline } from '../../components/Ui.jsx';
import { fmtD } from '../../lib/core.js';
import { GATE_ORDER } from '../../lib/derived.js';

const YN = ({ on }) => (on ? <Chip cls="g">yes</Chip> : <Chip cls="m">no</Chip>);

export default function MGovernance({ c }) {
  const g = c._g;
  const cs = c.consent;

  return (
    <div className="grid g2">
      <Card title="Consent — DPDP">
        <KV>
          <Row k="WhatsApp" v={<YN on={cs.whatsapp} />} />
          <Row k="SMS" v={<YN on={cs.sms} />} />
          <Row k="Email" v={<YN on={cs.email} />} />
          <Row k="Marketing" v={cs.marketing ? <Chip cls="g">yes</Chip> : <Chip cls="r">declined</Chip>} />
          <Row k="Recorded on" v={fmtD(cs.date)} miss={!cs.date} />
          <Row k="Children's data held" v={cs.children ? <Chip cls="w">yes</Chip> : <Chip cls="m">no</Chip>} />
        </KV>

        {cs.purpose && (
          <div className="note" style={{ marginTop: 10 }}><b>Purpose stated:</b> {cs.purpose}</div>
        )}

        {!cs.marketing && (
          <Banner kind="block" style={{ margin: '12px 0 0' }}>
            <b>No marketing consent.</b> Service and transactional messages only. A legal block, not a
            preference — it overrides any score and is enforced at send time.
          </Banner>
        )}

        <div className="note" style={{ marginTop: 11 }}>
          Marketing consent is captured separately from service consent, with the purpose stated and a
          withdrawal path on every message. Children's dates of birth need verifiable parental consent —
          worth asking whether that field earns its regulatory weight at all.
        </div>
      </Card>

      <Card title="Contact gate">
        <Banner kind={g.open ? 'ok' : 'block'} style={{ margin: 0 }}>
          <b>{g.open ? 'OPEN' : 'CLOSED'}</b> · <code>{g.code}</code><br />{g.why}
        </Banner>

        <div style={{ marginTop: 13 }}>
          <div className="eyebrow" style={{ marginBottom: 7 }}>Evaluation order — first match wins</div>
          <Timeline>
            {GATE_ORDER.map(([code, label, test]) => (
              <li key={code}>
                <span className="d">{test(c) ? <Chip cls="r">blocks</Chip> : <Chip cls="g">clear</Chip>}</span>
                <span className="t">{label}<div className="sub2"><code>{code}</code></div></span>
              </li>
            ))}
          </Timeline>
        </div>
      </Card>
    </div>
  );
}
