/* =====================================================================
   NAVIGATION — one entry per page: its route path, Sidebar grouping/
   icon/label, and header title/description. Single source of truth
   consumed by both App.jsx (to build <Routes> and the header) and
   Sidebar.jsx (to render nav links) — previously duplicated as
   App.jsx's META/VIEWS and Sidebar.jsx's own NAV array.
   ===================================================================== */
import {
  LayoutDashboard, Users, IdCard, CalendarClock, GitBranch, FileText, Send,
  Inbox, ClipboardList, LogOut, SlidersHorizontal, BookOpen, ShieldCheck, UserCog, FileWarning,
} from 'lucide-react';

import CommandCentre from '../pages/CommandCentre.jsx';
import OwnerBase from '../pages/OwnerBase.jsx';
import CustomerMaster from '../pages/CustomerMaster.jsx';
import TriggerCalendar from '../pages/TriggerCalendar.jsx';
import ReferralTree from '../pages/ReferralTree.jsx';
import PortfolioStatement from '../pages/PortfolioStatement.jsx';
import SendLog from '../pages/SendLog.jsx';
import Intake from '../pages/Intake.jsx';
import IncompleteRecords from '../pages/IncompleteRecords.jsx';
import ValuationRegister from '../pages/ValuationRegister.jsx';
import ExitRegister from '../pages/ExitRegister.jsx';
import ScoringEngine from '../pages/ScoringEngine.jsx';
import FieldDictionary from '../pages/FieldDictionary.jsx';
import AccessGovernance from '../pages/AccessGovernance.jsx';
import UserManagement from '../pages/UserManagement.jsx';

/* `path` is always the first URL segment for that page — master/statement
   additionally accept /:id and /:id/:tab, wired directly in App.jsx's
   <Routes> since that shape doesn't fit this flat one-row-per-page list. */
export const PAGES = [
  { id: 'command', path: 'command', group: 'Read', label: 'Command centre', Icon: LayoutDashboard,
    Component: CommandCentre,
    title: 'Command centre', desc: 'Who is ready to re-invest, who must not be touched, and what the base is worth today.' },
  { id: 'base', path: 'base', group: 'Read', label: 'Owner base', Icon: Users,
    Component: OwnerBase,
    title: 'Owner base', desc: 'Every owner across all three entities, scored and segmented. Click a row to open the customer master.' },
  { id: 'master', path: 'master', group: 'Read', label: 'Customer master', Icon: IdCard,
    Component: CustomerMaster,
    title: 'Customer master', desc: 'The full record. Everything the system knows about one owner, and every rule it applies to them.' },
  { id: 'triggers', path: 'triggers', group: 'Act', label: 'Trigger calendar', Icon: CalendarClock,
    Component: TriggerCalendar,
    title: 'Trigger calendar', desc: 'Dated reasons to make contact over the next 90 days. Blocked owners are stripped out automatically.' },
  { id: 'referrals', path: 'referrals', group: 'Act', label: 'Referral tree', Icon: GitBranch,
    Component: ReferralTree,
    title: 'Referral tree', desc: 'Which owners are actually generating your organic pipeline, and what that pipeline is worth.' },
  { id: 'statement', path: 'statement', group: 'Act', label: 'Portfolio statement', Icon: FileText,
    Component: PortfolioStatement,
    title: 'Portfolio statement', desc: 'The one page you send every owner. Loyalty product, data-capture mechanism and re-investment pitch in a single sheet.' },
  { id: 'sendlog', path: 'sendlog', group: 'Act', label: 'Statement send log', Icon: Send,
    Component: SendLog,
    title: 'Statement send log', desc: 'Every statement ever sent, what it produced, and what it cost you in disputes.' },
  { id: 'intake', path: 'intake', group: 'Data', label: 'Intake & exceptions', Icon: Inbox,
    Component: Intake,
    title: 'Intake & exceptions', desc: 'The write path. Three files in, validated, with everything that fails held in an exceptions queue.' },
  { id: 'incomplete', path: 'incomplete', group: 'Data', label: 'Incomplete records', Icon: FileWarning,
    Component: IncompleteRecords,
    title: 'Incomplete records', desc: "Owners imported from a raw allotment list, with no PAN or confirmed financials yet — held out of the owner base until completed." },
  { id: 'valuation', path: 'valuation', group: 'Data', label: 'Valuation register', Icon: ClipboardList,
    Component: ValuationRegister,
    title: 'Valuation register', desc: 'The signed monthly note behind every gain figure. Without this, your appreciation numbers are indefensible.' },
  { id: 'exits', path: 'exits', group: 'Data', label: 'Exit register', Icon: LogOut,
    Component: ExitRegister,
    title: 'Exit register', desc: 'Owners who sold without you. The running cost of not having a resale desk.' },
  { id: 'engine', path: 'engine', group: 'Build', label: 'Scoring engine', Icon: SlidersHorizontal,
    Component: ScoringEngine,
    title: 'Scoring engine', desc: 'Move the weights and watch the segments redraw. Nothing here is a black box.' },
  { id: 'dict', path: 'dict', group: 'Build', label: 'Field dictionary', Icon: BookOpen,
    Component: FieldDictionary,
    title: 'Field dictionary', desc: 'Every field the system reads or writes, with the named person accountable for capturing it.' },
  { id: 'access', path: 'access', group: 'Build', label: 'Access & governance', Icon: ShieldCheck,
    Component: AccessGovernance,
    title: 'Access & governance', desc: 'Who sees what, what is PII, how long it is kept, and what the customer can ask you to delete.' },
  { id: 'users', path: 'users', group: 'Build', label: 'User management', Icon: UserCog,
    Component: UserManagement,
    title: 'User management', desc: 'Add accounts and assign roles. Access itself is always decided by the role, never by the individual.' },
];

export const pageById = (id) => PAGES.find((p) => p.id === id);
