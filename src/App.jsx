import { useApp } from './context/AppContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import { fmtD, TODAY } from './lib/core.js';

import CommandCentre from './views/CommandCentre.jsx';
import OwnerBase from './views/OwnerBase.jsx';
import CustomerMaster from './views/CustomerMaster.jsx';
import TriggerCalendar from './views/TriggerCalendar.jsx';
import ReferralTree from './views/ReferralTree.jsx';
import PortfolioStatement from './views/PortfolioStatement.jsx';
import SendLog from './views/SendLog.jsx';
import Intake from './views/Intake.jsx';
import ValuationRegister from './views/ValuationRegister.jsx';
import ExitRegister from './views/ExitRegister.jsx';
import ScoringEngine from './views/ScoringEngine.jsx';
import FieldDictionary from './views/FieldDictionary.jsx';
import AccessGovernance from './views/AccessGovernance.jsx';

const META = {
  command: ['Command centre', 'Who is ready to re-invest, who must not be touched, and what the base is worth today.'],
  base: ['Owner base', 'Every owner across all three entities, scored and segmented. Click a row to open the customer master.'],
  master: ['Customer master', 'The full record. Everything the system knows about one owner, and every rule it applies to them.'],
  triggers: ['Trigger calendar', 'Dated reasons to make contact over the next 90 days. Blocked owners are stripped out automatically.'],
  referrals: ['Referral tree', 'Which owners are actually generating your organic pipeline, and what that pipeline is worth.'],
  statement: ['Portfolio statement', 'The one page you send every owner. Loyalty product, data-capture mechanism and re-investment pitch in a single sheet.'],
  sendlog: ['Statement send log', 'Every statement ever sent, what it produced, and what it cost you in disputes.'],
  intake: ['Intake & exceptions', 'The write path. Three files in, validated, with everything that fails held in an exceptions queue.'],
  valuation: ['Valuation register', 'The signed monthly note behind every gain figure. Without this, your appreciation numbers are indefensible.'],
  exits: ['Exit register', 'Owners who sold without you. The running cost of not having a resale desk.'],
  engine: ['Scoring engine', 'Move the weights and watch the segments redraw. Nothing here is a black box.'],
  dict: ['Field dictionary', 'Every field the system reads or writes, with the named person accountable for capturing it.'],
  access: ['Access & governance', 'Who sees what, what is PII, how long it is kept, and what the customer can ask you to delete.'],
};

const VIEWS = {
  command: CommandCentre,
  base: OwnerBase,
  master: CustomerMaster,
  triggers: TriggerCalendar,
  referrals: ReferralTree,
  statement: PortfolioStatement,
  sendlog: SendLog,
  intake: Intake,
  valuation: ValuationRegister,
  exits: ExitRegister,
  engine: ScoringEngine,
  dict: FieldDictionary,
  access: AccessGovernance,
};

export default function App() {
  const { view, base } = useApp();
  const [title, desc] = META[view];
  const View = VIEWS[view];

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <div className="top">
          <div className="r">
            <div>
              <h1>{title}</h1>
              <div className="d">{desc}</div>
            </div>
            <div className="sp" />
            <div className="asof">
              As on <b>{fmtD(TODAY)}</b><br />
              Sample data · {base.length} owners
            </div>
          </div>
        </div>
        <div className="wrap">
          <View />
        </div>
      </div>
    </div>
  );
}
