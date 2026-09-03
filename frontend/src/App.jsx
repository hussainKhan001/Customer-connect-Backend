import { useState } from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import { useApp } from './context/AppContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import UserMenu from './components/UserMenu.jsx';
import Login from './pages/Login.jsx';
import { fmtD, TODAY } from './utils/core.js';

import CommandCentre from './pages/CommandCentre.jsx';
import OwnerBase from './pages/OwnerBase.jsx';
import CustomerMaster from './pages/CustomerMaster.jsx';
import TriggerCalendar from './pages/TriggerCalendar.jsx';
import ReferralTree from './pages/ReferralTree.jsx';
import PortfolioStatement from './pages/PortfolioStatement.jsx';
import SendLog from './pages/SendLog.jsx';
import Intake from './pages/Intake.jsx';
import ValuationRegister from './pages/ValuationRegister.jsx';
import ExitRegister from './pages/ExitRegister.jsx';
import ScoringEngine from './pages/ScoringEngine.jsx';
import FieldDictionary from './pages/FieldDictionary.jsx';
import AccessGovernance from './pages/AccessGovernance.jsx';
import UserManagement from './pages/UserManagement.jsx';
import IncompleteRecords from './pages/IncompleteRecords.jsx';

const META = {
  command: ['Command centre', 'Who is ready to re-invest, who must not be touched, and what the base is worth today.'],
  base: ['Owner base', 'Every owner across all three entities, scored and segmented. Click a row to open the customer master.'],
  master: ['Customer master', 'The full record. Everything the system knows about one owner, and every rule it applies to them.'],
  triggers: ['Trigger calendar', 'Dated reasons to make contact over the next 90 days. Blocked owners are stripped out automatically.'],
  referrals: ['Referral tree', 'Which owners are actually generating your organic pipeline, and what that pipeline is worth.'],
  statement: ['Portfolio statement', 'The one page you send every owner. Loyalty product, data-capture mechanism and re-investment pitch in a single sheet.'],
  sendlog: ['Statement send log', 'Every statement ever sent, what it produced, and what it cost you in disputes.'],
  intake: ['Intake & exceptions', 'The write path. Three files in, validated, with everything that fails held in an exceptions queue.'],
  incomplete: ['Incomplete records', "Owners imported from a raw allotment list, with no PAN or confirmed financials yet — held out of the owner base until completed."],
  valuation: ['Valuation register', 'The signed monthly note behind every gain figure. Without this, your appreciation numbers are indefensible.'],
  exits: ['Exit register', 'Owners who sold without you. The running cost of not having a resale desk.'],
  engine: ['Scoring engine', 'Move the weights and watch the segments redraw. Nothing here is a black box.'],
  dict: ['Field dictionary', 'Every field the system reads or writes, with the named person accountable for capturing it.'],
  access: ['Access & governance', 'Who sees what, what is PII, how long it is kept, and what the customer can ask you to delete.'],
  users: ['User management', 'Add accounts and assign roles. Access itself is always decided by the role, never by the individual.'],
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
  incomplete: IncompleteRecords,
  valuation: ValuationRegister,
  exits: ExitRegister,
  engine: ScoringEngine,
  dict: FieldDictionary,
  access: AccessGovernance,
  users: UserManagement,
};

export default function App() {
  const { user, authLoading } = useAuth();
  const { view, base, loading, loadError, live } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [title, desc] = META[view];
  const View = VIEWS[view];

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    );
  }

  if (!user) return <Login />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
        Loading owner base…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 px-6">
        <div className="max-w-md text-center">
          <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1.5">Could not reach the API</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {loadError} — confirm the backend is running (<code className="font-mono">npm run server</code> or{' '}
            <code className="font-mono">npm run dev:all</code>) and MongoDB is reachable.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 print:h-auto print:overflow-visible">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} collapsed={collapsed} />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto custom-scrollbar print:overflow-visible">
        <div className="print:hidden sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-100/80 dark:border-gray-700/50 shadow-sm px-4 sm:px-6 py-2">
          <div className="flex items-center gap-3 flex-wrap max-w-[1800px] mx-auto">
            <button
              onClick={toggleSidebar}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 active:scale-95"
              title="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight truncate">{title}</h1>
              <p className="hidden sm:block text-[10.5px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5 max-w-xl truncate">{desc}</p>
            </div>
            <div className="flex-1" />
            <div
              className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
              title={live ? 'Realtime sync connected — MongoDB changes appear here automatically' : 'Realtime sync disconnected — reconnecting…'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
              {live ? 'Live' : 'Offline'}
            </div>
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="hidden md:block text-[10px] text-gray-400 dark:text-gray-500 text-right leading-tight">
              As on <b className="text-gray-600 dark:text-gray-300">{fmtD(TODAY)}</b><br />
              Sample data · {base.length} owners
            </div>
            <UserMenu />
          </div>
        </div>
        <div className="p-4 sm:p-6 pb-16 max-w-[1800px] w-full mx-auto">
          <View />
        </div>
      </div>
    </div>
  );
}
