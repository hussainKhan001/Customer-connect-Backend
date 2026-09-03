/* =====================================================================
   UI PRIMITIVES — the small pieces every view is built from, restyled
   to the Tailwind/dark-mode design system (see UI_STYLE_GUIDE.md).
   Prop shapes are unchanged from the original so views keep working.
   ===================================================================== */
import { Children } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { initials } from '../utils/core.js';

/* Chip tone → Tailwind status-badge pair. A–D are the owner segments,
   g/w/r/m/k are the shared semantic tones used everywhere else. */
const CHIP_TONE = {
  A: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  C: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  D: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  g: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  w: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  r: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  m: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  k: 'bg-gray-800 text-white dark:bg-gray-900 dark:text-gray-200',
};

export const Chip = ({ cls = 'm', children }) => (
  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${CHIP_TONE[cls] || CHIP_TONE.m}`}>
    {children}
  </span>
);

/* Initials avatar for list/row contexts (table rows, tree nodes, log
   lines) — every page that needed one before this (CustomerMaster's
   page-hero avatar, TriggerCalendar's row avatar, UserMenu's account
   avatar) hand-rolled its own slightly different version; this is the
   one everyone else should reuse. CustomerMaster's square, larger
   page-hero avatar stays bespoke on purpose — it's a different context
   (page identity, not a row in a list) — so this is deliberately
   circular, sized for rows. */
const AVATAR_SIZE = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-[13px]',
  lg: 'w-12 h-12 text-base',
};
export const Avatar = ({ name, size = 'sm', className = '' }) => {
  const { getThemeColor } = useTheme();
  return (
    <div
      className={`${AVATAR_SIZE[size] || AVATAR_SIZE.sm} flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${className}`}
      style={{ backgroundColor: getThemeColor() }}
    >
      {initials(name)}
    </div>
  );
};

/* Pulsing placeholder block for loading states — sized entirely via
   `className` (e.g. "h-4 w-32", "h-10 w-10 rounded-full") so callers
   compose their own skeleton shells from it. */
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

export const ScoreBar = ({ n }) => (
  <div className="flex items-center gap-2">
    <span className="w-6 text-sm font-bold tabular-nums text-gray-800 dark:text-gray-100">{n}</span>
    <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <div
        className={`h-full rounded-full ${n < 50 ? 'bg-gray-400 dark:bg-gray-500' : 'bg-primary-500'}`}
        style={{ width: `${n}%` }}
      />
    </div>
  </div>
);

/* A key/value line. `v` may be any node; null or '' reads "not captured"
   so a gap is visible rather than silently blank. */
export const Row = ({ k, v, miss }) => (
  <div className="flex justify-between gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
    <span className="text-gray-500 dark:text-gray-400">{k}</span>
    <span className={`font-semibold text-right ${miss ? 'font-normal italic text-amber-600 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'}`}>
      {v == null || v === '' ? 'not captured' : v}
    </span>
  </div>
);

export const KV = ({ children }) => <div>{children}</div>;

export function Card({ title, hint, children, pad = true, className = '', style }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow duration-200 mb-3.5 ${className}`.trim()} style={style}>
      {title && (
        <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100">{title}</h3>
          {hint != null && <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">{hint}</span>}
        </div>
      )}
      {pad ? <div className="p-3.5">{children}</div> : children}
    </div>
  );
}

const BANNER_TONE = {
  block: 'bg-red-50 dark:bg-red-900/10 border-red-500 text-red-800 dark:text-red-300',
  ok: 'bg-orange-50 dark:bg-orange-900/10 border-primary-500 text-orange-900 dark:text-orange-200',
  info: 'bg-blue-50 dark:bg-blue-900/10 border-blue-500 text-blue-900 dark:text-blue-200',
  warn: 'bg-amber-50 dark:bg-amber-900/10 border-amber-500 text-amber-900 dark:text-amber-200',
  good: 'bg-green-50 dark:bg-green-900/10 border-green-500 text-green-900 dark:text-green-200',
};

export const Banner = ({ kind = 'info', children, style }) => (
  <div className={`px-3.5 py-2.5 rounded-2xl border-l-4 shadow-sm text-[13px] leading-relaxed mb-3.5 ${BANNER_TONE[kind] || BANNER_TONE.info}`} style={style}>
    {children}
  </div>
);

const METER_FILL = {
  o: 'bg-primary-500',
  g: 'bg-green-500',
  r: 'bg-red-500',
  '': 'bg-gray-700 dark:bg-gray-300',
};

export const Meter = ({ label, value, sub, cls, width }) => (
  <div className="mb-2.5">
    <div className="flex justify-between text-[13px] mb-1">
      <span className="text-gray-700 dark:text-gray-300">
        {label}
        {sub && <span className="text-[11px] text-gray-400 dark:text-gray-500"> · {sub}</span>}
      </span>
      <b className="tabular-nums text-gray-900 dark:text-white">{value}</b>
    </div>
    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <div className={`h-full rounded-full ${METER_FILL[cls] || METER_FILL['']}`} style={{ width: `${width}%` }} />
    </div>
  </div>
);

const KPI_TONE = {
  g: 'text-green-600 dark:text-green-400',
  o: 'text-primary-600 dark:text-primary-400',
  r: 'text-red-600 dark:text-red-400',
};

const KPI_ICON_TONE = {
  g: 'text-green-500 dark:text-green-400',
  o: 'text-primary-500 dark:text-primary-400',
  r: 'text-red-500 dark:text-red-400',
};

/* Stat tile — label + big number on the left, a semantic-colored icon on
   the right (never the plain faded decorative kind). `active` rings the
   tile in the theme color for a currently-applied filter/selection. */
export const Kpi = ({ label, value, sub, tone, icon: Icon, active }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm hover:shadow-md transition-shadow duration-200 p-4 ${
      active ? 'border-primary-400 dark:border-primary-500 ring-2 ring-primary-400/30' : 'border-gray-100 dark:border-gray-700/60'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate">{label}</div>
        <div className={`text-2xl font-black tabular-nums tracking-tight mt-1 ${KPI_TONE[tone] || 'text-gray-900 dark:text-white'}`}>{value}</div>
      </div>
      {Icon && <Icon className={`w-6 h-6 flex-shrink-0 ${KPI_ICON_TONE[tone] || 'text-gray-300 dark:text-gray-600'}`} strokeWidth={2} />}
    </div>
    {sub != null && sub !== '' && <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-snug">{sub}</div>}
  </div>
);

const KPI_GRID = { 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4', 5: 'grid-cols-2 sm:grid-cols-5', 6: 'grid-cols-2 sm:grid-cols-6' };

export const Kpis = ({ children }) => (
  <div className={`grid ${KPI_GRID[Children.count(children)] || KPI_GRID[5]} gap-3 mb-4`}>{children}</div>
);

/* Horizontally scrollable table shell — wide tables scroll inside the
   card rather than pushing the page sideways. */
export const TableWrap = ({ children }) => <div className="overflow-x-auto custom-horizontal-scrollbar">{children}</div>;

export const Timeline = ({ children }) => <ul className="list-none m-0 p-0">{children}</ul>;

const DOT_TONE = { g: 'bg-green-500', o: 'bg-primary-500', r: 'bg-red-500', '': 'bg-gray-400 dark:bg-gray-500' };

export const Dot = ({ tone = '' }) => <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${DOT_TONE[tone] || DOT_TONE['']}`} />;

/* Confidence percentages share one colour ramp across every view. */
export const confColor = (p) =>
  p >= 80 ? 'text-green-600 dark:text-green-400' : p >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
export const confMeterCls = (p) => (p >= 80 ? 'g' : p >= 60 ? 'o' : 'r');
export const healthMeterCls = (p) => (p >= 60 ? 'g' : p >= 40 ? 'o' : 'r');

/* Shared button classes — see UI_STYLE_GUIDE.md §7 */
export const btnBase = 'rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';
export const btnGhost = `${btnBase} bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2`;

/* Shared field classes for every Modal-based form (label / input / error
   text / checkbox) — one definition so the growing set of operational
   edit modals (Status/Complaint/Loan/Valuation/Referral/Event/Exit)
   don't each redeclare the same Tailwind strings. Named distinctly from
   Intake.jsx's own separately-scoped local consts of similar names. */
export const formLabelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1';
export const formInputCls = (bad) =>
  `w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${bad ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`;
export const formErrorCls = 'text-xs text-red-500 mt-1';
export const formCheckCls = 'w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500';

/* Compact pill button for row-level actions inside tables/cards (Edit,
   Add, Close, Exit, +1 visit, etc.) — a real button (background, hover
   state) rather than a bare uppercase text link, so it reads as
   clickable at a glance instead of blending into surrounding labels. */
const ROW_ACTION_TONE = {
  primary: 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:hover:bg-primary-900/30',
  green: 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30',
  red: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30',
};
export const rowActionCls = (tone = 'primary') =>
  `inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${ROW_ACTION_TONE[tone] || ROW_ACTION_TONE.primary}`;

export function BtnPrimary({ children, className = '', style, ...rest }) {
  const { getThemeColor } = useTheme();
  return (
    <button
      className={`${btnBase} text-white px-4 py-2 shadow-sm hover:shadow-md hover:opacity-90 ${className}`}
      style={{ backgroundColor: getThemeColor(), ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
