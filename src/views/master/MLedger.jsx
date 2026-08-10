import { Card, Chip, Row, KV } from '../../components/Ui.jsx';
import { fmtD, inrF } from '../../lib/core.js';
import { roll } from '../../lib/derived.js';

export default function MLedger({ c }) {
  return roll(c).all.map((u) => {
    const reconciles = Math.abs(u.rate * u.saleable - u.discount - u.consideration) < 1;
    return (
      <Card
        key={u.unit}
        title={`${u.unit} — payment ledger`}
        hint={`${u.receipts} receipts${u.bounced ? ' · ' + u.bounced + ' returned' : ''}`}
      >
        <div className="grid g2">
          <KV>
            <Row k="Consideration" v={inrF(u.consideration)} />
            <Row k="Received to date" v={`${inrF(u.paid)} (${u.paidPct.toFixed(0)}%)`} />
            <Row k="Outstanding" v={u.outstanding
              ? <span style={{ color: 'var(--warn)' }}>{inrF(u.outstanding)}</span>
              : inrF(0)} />
            <Row k="Last receipt" v={fmtD(u.lastReceipt)} />
            <Row k="Instruments returned" v={u.bounced
              ? <span style={{ color: 'var(--block)' }}>{u.bounced}</span>
              : '0'} />
          </KV>
          <KV>
            <Row k="Funding" v={u.loan.selfFunded ? 'Self-funded' : `${u.loan.bank} · ${u.loan.tenure} yr`} />
            <Row k="EMI started" v={fmtD(u.loan.start) || '—'} />
            <Row k="Scheduled closure" v={fmtD(u.loan.closure) || '—'} />
            <Row k="Actual closure" v={
              u.loan.closedOn ? (
                <>{fmtD(u.loan.closedOn)} <Chip cls="g">{u.loan.prepaid ? 'foreclosed' : 'closed'}</Chip></>
              ) : u.loan.selfFunded ? '—' : <Chip cls="w">running</Chip>
            } />
            <Row k="Rate × area reconciles" v={reconciles
              ? <Chip cls="g">yes</Chip>
              : <Chip cls="r">MISMATCH</Chip>} />
          </KV>
        </div>
        <div className="note" style={{ marginTop: 12 }}>
          <b>Paid-to-date is derived from the receipt ledger, never keyed in.</b> A hand-typed figure is how
          a reconciliation gap survives an audit — and once it appears on a branded statement in a
          customer's hand it is far harder to walk back than a wrong figure on a demand letter.
        </div>
      </Card>
    );
  });
}
