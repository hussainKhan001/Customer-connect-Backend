import { Card, Banner } from '../components/Ui.jsx';
import { ROLES, PERMS, PERM_LABEL } from '../lib/reference.js';

const RETENTION = [
  ['Legal file — agreement, registry, KYC', 'Statutory period'],
  ['Payment ledger', '8 years'],
  ['Marketing profile — DOB, anniversary, occupation', 'Until consent withdrawn'],
  ['Statement archive', '7 years'],
  ['Activity and contact log', '3 years'],
  ['Exited owners — marketing fields', 'Purge on exit'],
];

export default function AccessGovernance() {
  return (
    <>
      <Banner kind="info">
        <b>Right now every screen shows every owner's financial position.</b> A telecaller does not need to
        see 240 people's payment positions and unrealised gains — that is a leak and a poaching risk in a
        market where your own staff are the most likely people to take a list with them. Role-based access
        is not a phase-three nicety; it goes in before the pilot.
      </Banner>

      <Card title="Access matrix" hint="nobody, at any level, can override the gate" pad={false}>
        <div className="tw">
          <table className="matrix">
            <thead>
              <tr>
                <th>What</th>
                {ROLES.map((r) => <th key={r}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMS.map(([l, p]) => (
                <tr key={l}>
                  <td>{l}</td>
                  {p.map((x, i) => {
                    const { cls, t } = PERM_LABEL[x];
                    return <td key={i}><span className={cls}>{t}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid g2">
        <Card title="DPDP obligations">
          <ul className="rules" style={{ margin: 0, paddingLeft: 16 }}>
            <li><b>Purpose stated at capture.</b> Portfolio statements, launch invitations, service
              updates — named, not implied.</li>
            <li><b>Marketing consent separate from service consent.</b> Declining one must not silence the
              other.</li>
            <li><b>Withdrawal path on every message.</b> One tap, honoured within the same day.</li>
            <li><b>Children's data needs verifiable parental consent.</b> Ask whether a child's birthday
              greeting is worth the obligation it creates. My view: it is not.</li>
            <li><b>Right to correction and erasure.</b> A customer can ask you to delete their profile. The
              ledger and legal file are retained under a statutory basis; the marketing profile is not.</li>
            <li><b>Breach notification.</b> You need a named person and a written procedure before you hold
              this much PII in one place.</li>
          </ul>
        </Card>

        <Card title="Retention">
          <table>
            <tbody>
              {RETENTION.map(([what, how]) => (
                <tr key={what}><td>{what}</td><td className="r"><b>{how}</b></td></tr>
              ))}
            </tbody>
          </table>
          <div className="note" style={{ marginTop: 11 }}>
            An exited owner keeps their legal and ledger record — you may need it — but their marketing
            profile is purged. That is both a DPDP obligation and the cleanest way to guarantee no
            statement ever reaches them by accident.
          </div>
        </Card>
      </div>
    </>
  );
}
