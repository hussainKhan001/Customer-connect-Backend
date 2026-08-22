import { Fragment } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { PROJECTS, VAL_STALE_DAYS, daysTo } from '../lib/core.js';
import { triggerList } from '../lib/derived.js';
import { exceptions } from '../lib/intake.js';
import {
  LayoutDashboard, Users, IdCard, CalendarClock, GitBranch, FileText, Send,
  Inbox, ClipboardList, LogOut, SlidersHorizontal, BookOpen, ShieldCheck, UserCog, FileWarning, X,
} from 'lucide-react';

export const NAV = [
  ['Read', 'command', 'Command centre', LayoutDashboard],
  ['Read', 'base', 'Owner base', Users],
  ['Read', 'master', 'Customer master', IdCard],
  ['Act', 'triggers', 'Trigger calendar', CalendarClock],
  ['Act', 'referrals', 'Referral tree', GitBranch],
  ['Act', 'statement', 'Portfolio statement', FileText],
  ['Act', 'sendlog', 'Statement send log', Send],
  ['Data', 'intake', 'Intake & exceptions', Inbox],
  ['Data', 'incomplete', 'Incomplete records', FileWarning],
  ['Data', 'valuation', 'Valuation register', ClipboardList],
  ['Data', 'exits', 'Exit register', LogOut],
  ['Build', 'engine', 'Scoring engine', SlidersHorizontal],
  ['Build', 'dict', 'Field dictionary', BookOpen],
  ['Build', 'access', 'Access & governance', ShieldCheck],
  ['Build', 'users', 'User management', UserCog],
];

export default function Sidebar({ mobileOpen = false, onCloseMobile, collapsed = false }) {
  const { base, incompleteRecords, view, setView } = useApp();
  const { getThemeColor } = useTheme();

  const ex = exceptions(base).length;
  const stale = PROJECTS.filter((p) => daysTo(p.noted) < -VAL_STALE_DAYS).length;
  const counts = {
    base: base.length,
    triggers: triggerList(base).length,
    intake: ex || '',
    incomplete: incompleteRecords.length || '',
    valuation: stale || '',
    exits: base.filter((c) => c.status === 'EXITED').length,
  };
  const alerts = { intake: !!ex, incomplete: !!incompleteRecords.length, valuation: !!stale };

  let lastGroup = null;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm transition-opacity duration-300 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`print:hidden fixed lg:static inset-y-0 left-0 z-[9999] flex flex-col
          bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg shadow-gray-200/40 dark:shadow-black/20
          border border-gray-100/80 dark:border-gray-700/50
          transition-[width,transform] duration-300 ease-in-out
          w-72 max-w-[85vw] lg:max-w-none
          ${collapsed ? 'lg:w-16' : 'lg:w-56'}
          lg:my-1 lg:ml-1 lg:rounded-2xl lg:h-[calc(100vh-8px)]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`h-16 flex items-center gap-2.5 px-4 border-b border-gray-100/80 dark:border-gray-700/50 flex-shrink-0 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200" style={{ backgroundColor: getThemeColor() }}>
            <span className="text-white text-xs font-black">NC</span>
          </div>
          <div className={`min-w-0 transition-opacity duration-200 ${collapsed ? 'lg:hidden' : ''}`}>
            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">Neoteric Connect</div>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 truncate">Owner Portfolio System</div>
          </div>
          <button onClick={onCloseMobile} className="ml-auto lg:hidden w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-2">
          {NAV.map(([grp, id, lbl, Icon]) => {
            const head = grp !== lastGroup ? grp : null;
            lastGroup = grp;
            const active = view === id;
            return (
              <Fragment key={id}>
                {head && (
                  <div className={`px-4 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 pointer-events-none ${collapsed ? 'lg:hidden' : ''}`}>
                    {head}
                  </div>
                )}
                <button
                  title={collapsed ? lbl : undefined}
                  onClick={() => { setView(id); onCloseMobile?.(); }}
                  className={`flex items-center gap-2.5 w-[calc(100%-1rem)] text-left rounded-xl mx-2 my-0.5 px-2.5 py-2 text-[13px] transition-all duration-200 ${collapsed ? 'lg:justify-center lg:px-0' : ''} ${
                    active ? 'font-semibold bg-primary-500/10 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/70 dark:hover:bg-gray-700/50 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                  style={active ? { color: getThemeColor() } : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className={collapsed ? 'lg:hidden' : 'flex-1 min-w-0 truncate'}>{lbl}</span>
                  <span className={`flex-shrink-0 whitespace-nowrap text-[10px] text-gray-400 dark:text-gray-500 ${alerts[id] ? 'font-bold' : ''} ${collapsed ? 'lg:hidden' : ''}`} style={alerts[id] ? { color: getThemeColor() } : undefined}>
                    {counts[id] ?? ''}
                  </span>
                </button>
              </Fragment>
            );
          })}
        </nav>

        <div className={`px-4 py-2.5 border-t border-gray-100/80 dark:border-gray-700/50 text-[9.5px] leading-relaxed text-gray-400 dark:text-gray-500 flex-shrink-0 transition-opacity duration-200 ${collapsed ? 'lg:hidden' : ''}`}>
          v1.0 prototype · sample data<br />
          Neoteric Properties · Navayan Realty · Heaven Heights
        </div>
      </aside>
    </>
  );
}
