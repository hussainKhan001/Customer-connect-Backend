import { Card, Banner, TableWrap } from '../components/Ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES, PERMS, PERM_LABEL } from '../utils/reference.js';

const RETENTION = [
  ['Legal file — agreement, registry, KYC', 'Statutory period'],
  ['Payment ledger', '8 years'],
  ['Marketing profile — DOB, anniversary, occupation', 'Until consent withdrawn'],
  ['Statement archive', '7 years'],
  ['Activity and contact log', '3 years'],
  ['Exited owners — marketing fields', 'Purge on exit'],
];

/* PERM_LABEL cls values ('yes' / 'no' / 'part') are semantic strings from
   lib/reference.js — map them to Tailwind here rather than touching the data. */
const MATRIX_CLS = {
  yes: 'text-green-600 dark:text-green-400 font-bold',
  no: 'text-gray-400 dark:text-gray-500',
  part: 'text-amber-600 dark:text-amber-400 font-bold',
};

const matrixTh = 'text-center text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold px-2 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 whitespace-nowrap';

export default function AccessGovernance() {
  const { user } = useAuth();
  const myIdx = user ? ROLES.indexOf(user.role) : -1;

  return (
    <>
      <Banner kind="info">
        <b>Right now every screen shows every owner's financial position.</b> A telecaller does not need to
        see 240 people's payment positions and unrealised gains — that is a leak and a poaching risk in a
        market where your own staff are the most likely people to take a list with them. Role-based access
        is not a phase-three nicety; it goes in before the pilot.
      </Banner>

      <Card
        title="Access matrix"
        hint={myIdx >= 0 ? `nobody, at any level, can override the gate · your role (${user.role}) is highlighted` : 'nobody, at any level, can override the gate'}
        pad={false}
      >
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${matrixTh} text-left`}>What</th>
                {ROLES.map((r, i) => (
                  <th key={r} className={`${matrixTh} ${i === myIdx ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : ''}`}>
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMS.map(([l, p]) => (
                <tr key={l} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                  <td className="text-left font-bold text-[11px] px-2 py-1.5 text-gray-900 dark:text-white">{l}</td>
                  {p.map((x, i) => {
                    const { cls, t } = PERM_LABEL[x];
                    return (
                      <td key={i} className={`text-center text-[11px] px-2 py-1.5 ${i === myIdx ? 'bg-primary-50/60 dark:bg-primary-900/10' : ''}`}>
                        <span className={MATRIX_CLS[cls] || ''}>{t}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="DPDP obligations">
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
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
          <table className="w-full border-collapse">
            <tbody>
              {RETENTION.map(([what, how]) => (
                <tr key={what} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                  <td className="py-1.5 pr-3 text-sm text-gray-600 dark:text-gray-300">{what}</td>
                  <td className="py-1.5 text-right text-sm"><b className="text-gray-900 dark:text-white">{how}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2.5">
            An exited owner keeps their legal and ledger record — you may need it — but their marketing
            profile is purged. That is both a DPDP obligation and the cleanest way to guarantee no
            statement ever reaches them by accident.
          </div>
        </Card>
      </div>
    </>
  );
}
