import { Fragment } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { PROJECTS, VAL_STALE_DAYS, daysTo } from '../lib/core.js';
import { triggerList } from '../lib/derived.js';
import { exceptions } from '../lib/intake.js';

export const NAV = [
  ['Read', 'command', 'Command centre'],
  ['Read', 'base', 'Owner base'],
  ['Read', 'master', 'Customer master'],
  ['Act', 'triggers', 'Trigger calendar'],
  ['Act', 'referrals', 'Referral tree'],
  ['Act', 'statement', 'Portfolio statement'],
  ['Act', 'sendlog', 'Statement send log'],
  ['Data', 'intake', 'Intake & exceptions'],
  ['Data', 'valuation', 'Valuation register'],
  ['Data', 'exits', 'Exit register'],
  ['Build', 'engine', 'Scoring engine'],
  ['Build', 'dict', 'Field dictionary'],
  ['Build', 'access', 'Access & governance'],
];

export default function Sidebar() {
  const { base, view, setView } = useApp();

  const ex = exceptions(base).length;
  const stale = PROJECTS.filter((p) => daysTo(p.noted) < -VAL_STALE_DAYS).length;
  const counts = {
    base: base.length,
    triggers: triggerList(base).length,
    intake: ex || '',
    valuation: stale || '',
    exits: base.filter((c) => c.status === 'EXITED').length,
  };
  const alerts = { intake: !!ex, valuation: !!stale };

  let lastGroup = null;

  return (
    <aside className="rail">
      <div className="brand">
        <div className="mk"><div className="dot" /><div className="nm">Neoteric Connect</div></div>
        <div className="sb">Owner Portfolio System</div>
      </div>
      <nav className="nav">
        {NAV.map(([grp, id, lbl]) => {
          const head = grp !== lastGroup ? grp : null;
          lastGroup = grp;
          return (
            <Fragment key={id}>
              {head && <div className="grp">{head}</div>}
              <button className={view === id ? 'on' : ''} onClick={() => setView(id)}>
                {lbl}
                <span className={`ct${alerts[id] ? ' alert' : ''}`}>{counts[id] ?? ''}</span>
              </button>
            </Fragment>
          );
        })}
      </nav>
      <div className="rfoot">
        v1.0 prototype · sample data<br />
        Neoteric Properties · Navayan Realty · Heaven Heights
      </div>
    </aside>
  );
}
