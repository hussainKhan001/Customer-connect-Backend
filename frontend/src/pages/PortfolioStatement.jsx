import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useApp } from '../context/AppContext.jsx';
import { useCurrentCustomer } from '../hooks/useCurrentCustomer.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { Card, Timeline, btnGhost } from '../components/Ui.jsx';
import ThemedSelect from '../components/theme/ThemedSelect.jsx';
import RateLadder from '../components/RateLadder.jsx';
import { TODAY, fmtD, inr, inrF, psf } from '../utils/core.js';
import { roll } from '../utils/derived.js';
import { apiFetch } from '../utils/api.js';

export default function PortfolioStatement() {
  const { base, patchCustomer } = useApp();
  const { getThemeColor } = useTheme();
  const navigate = useNavigate();

  const printAndLog = async (customerId) => {
    window.print();
    /* the print itself isn't gated on this — a failed log shouldn't
       stop the user's already-requested print — but a successful send
       should show up in Statement Send Log without a page reload, and
       a role-based denial (403, per the PERMS matrix) should actually
       be shown, not silently swallowed */
    try {
      const res = await apiFetch(`/api/customers/${customerId}/statements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ch: 'WhatsApp PDF' }),
      });
      if (res.ok) {
        patchCustomer(await res.json());
      } else if (res.status === 403 || res.status === 409) {
        const body = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'warning', title: 'Not sent', text: body.error || 'This send was blocked.' });
      }
    } catch {
      // offline/unreachable — the seeded/previous send history still renders fine
    }
  };

  /* the picker only ever offers owners the gate has cleared */
  const pool = base.filter((c) => !c._blocked && c._live).sort((a, b) => b._gain - a._gain);

  /* hooks must run unconditionally on every render, so this — and the
     redirect effect below — sit above the "no pool" early return even
     though they're meaningless when pool is empty (current then comes
     back undefined and the effect no-ops). */
  const { current, isFallback } = useCurrentCustomer(pool, pool[0]);
  useEffect(() => {
    if (!current || !isFallback) return;
    navigate(`/statement/${current.id}`, { replace: true });
  }, [current, isFallback, navigate]);

  if (!pool.length) {
    return (
      <div className="p-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        No owner currently clears the gate for a statement.
      </div>
    );
  }

  const c = current;
  const r = roll(c);
  const u = r.units[0];
  const y = u.heldYrs.toFixed(1);
  const gainPct = (r.gain / r.consideration) * 100;
  const booked = c.referrals.filter((x) => x.status === 'Booked').length;

  const ownerOptions = pool.slice(0, 60).map((x) => ({
    value: x.id,
    label: `${x.name} — ${x._project} ${x._unit} — gain ${inr(x._gain)}`,
  }));

  const stmtRef = `STMT-${c.id}-Q${Math.ceil((TODAY.getMonth() + 1) / 3)}${TODAY.getFullYear()}`;

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center mb-3 print:hidden">
        <ThemedSelect
          value={c.id}
          onChange={(v) => navigate(`/statement/${v}`, { replace: true })}
          options={ownerOptions}
          className="w-full sm:w-auto sm:min-w-[340px] sm:max-w-[340px]"
        />
        <button className={`${btnGhost} text-xs px-2.5 py-1.5`} onClick={() => printAndLog(c.id)}>
          Print / save as PDF
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          {base.filter((x) => x._blocked).length} blocked owners are excluded from this picker by design.
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl max-w-[790px] mx-auto rounded-xl print:shadow-none print:border-0 print:max-w-none">
        <div className="bg-gray-900 dark:bg-black text-white rounded-t-xl p-5 flex items-center justify-between gap-3 print:rounded-none">
          <div className="flex gap-3 items-center min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: getThemeColor() }}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400">
                {u.entity} · Owner Portfolio Statement
              </div>
              <h2 className="text-lg font-bold leading-tight truncate">Your property, {y} years on</h2>
            </div>
          </div>
          <div className="text-right flex-shrink-0 hidden sm:block">
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Statement no.</div>
            <div className="text-[11.5px] font-mono text-gray-200 mt-0.5">{stmtRef}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{fmtD(TODAY)}</div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Prepared for
              </div>
              <div className="text-[15.5px] font-bold mt-0.5 text-gray-900 dark:text-white">
                {c.salutation} {c.name}
              </div>
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500">{c.id} · {c.city}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Your unit
              </div>
              <div className="text-[15.5px] font-bold mt-0.5 text-gray-900 dark:text-white">{u.unit}</div>
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500">
                {u.project} · {u.type} · {u.saleable} sq.ft.
              </div>
            </div>
          </div>

          <div className="text-center py-6 mt-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30">
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              What your home has gained since you booked it
            </div>
            <div className="text-5xl font-black text-primary-600 dark:text-primary-400 tabular-nums mt-2">
              {inr(r.gain)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 tabular-nums mt-2">
              {gainPct.toFixed(0)}% over {y} years · {u.cagr.toFixed(1)}% compounded each year
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
              Rate per sq.ft. — what you paid, what the market says today
            </div>
            <RateLadder u={u} labels={['You paid', 'Govt. circle', 'Recent resale']} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700 mt-4 pt-4">
            <div className="pb-4 sm:pb-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
              <div className="text-xs text-gray-500 dark:text-gray-400">You have paid</div>
              <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white mt-1">{inrF(r.paid)}</div>
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">
                {((r.paid / r.consideration) * 100).toFixed(0)}% of {inrF(r.consideration)}
              </div>
            </div>
            <div className="pt-4 pb-4 sm:pt-0 sm:pb-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
              <div className="text-xs text-gray-500 dark:text-gray-400">Value today</div>
              <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white mt-1">{inrF(r.value)}</div>
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">
                at recent resale in {u.project}
              </div>
            </div>
            <div className="pt-4 sm:pt-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
              <div className="text-xs text-gray-500 dark:text-gray-400">Booked on</div>
              <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-white mt-1">{fmtD(u.bookDate)}</div>
              <div className="text-[10.5px] text-gray-400 dark:text-gray-500 mt-0.5">
                {u.regDate ? 'Registered ' + fmtD(u.regDate) : 'Registry pending'}
              </div>
            </div>
          </div>

          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-4 mb-2">
            Your journey with us
          </div>
          <Timeline>
            <li className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
              <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{fmtD(u.bookDate)}</span>
              <span className="text-gray-700 dark:text-gray-300">Booked {u.unit} at {psf(u.rate)} per sq.ft.</span>
            </li>
            {u.regDate && (
              <li className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
                <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{fmtD(u.regDate)}</span>
                <span className="text-gray-700 dark:text-gray-300">Registry completed</span>
              </li>
            )}
            {u.possDate && (
              <li className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
                <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{fmtD(u.possDate)}</span>
                <span className="text-gray-700 dark:text-gray-300">Possession handed over</span>
              </li>
            )}
            {!!booked && (
              <li className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
                <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">—</span>
                <span className="text-gray-700 dark:text-gray-300">
                  You introduced {booked} famil{booked > 1 ? 'ies' : 'y'} who now live here{' '}
                  <b className="text-green-600 dark:text-green-400">Thank you</b>
                </span>
              </li>
            )}
            <li className="flex gap-2.5 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0 text-sm">
              <span className="w-20 flex-shrink-0 text-gray-400 dark:text-gray-500 text-xs tabular-nums">{fmtD(TODAY)}</span>
              <span className="text-gray-700 dark:text-gray-300">
                Assessed value today{' '}
                <b className="tabular-nums text-green-600 dark:text-green-400">{inrF(r.value)}</b>
              </span>
            </li>
          </Timeline>

          <div className="border border-dashed border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/10 rounded-lg p-3.5 mt-4">
            <h4 className="text-sm font-bold text-primary-800 dark:text-primary-300">
              Get this every quarter — and unlock what sits underneath it
            </h4>
            <div className="text-[11.5px] text-primary-800 dark:text-primary-300 mt-1.5">
              Complete your owner profile once and we will send this statement four times a year, along with:
            </div>
            <ul className="mt-2 space-y-1 text-[11.5px] text-primary-900 dark:text-primary-200 list-disc pl-5">
              <li>First right on new launches at pre-launch rate, 72 hours before public opening</li>
              <li>Exchange programme — we assess and buy back your unit and set it against your next one</li>
              <li>Referral rewards when someone you introduce books with us</li>
            </ul>
            <div className="mt-2.5 text-[11px] text-gray-500 dark:text-gray-400">
              The profile asks for: date of birth · wedding anniversary · children's dates of birth ·
              occupation · who introduced you to Neoteric
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-t border-gray-100 dark:border-gray-700 pt-3 mt-4">
            <div className="text-[9.5px] text-gray-400 dark:text-gray-500 leading-relaxed max-w-lg">
              Assessed value is derived from registered resale transactions in {u.project} over the last two
              quarters, floored at the prevailing government circle rate, per the valuation note dated{' '}
              {fmtD(u.val.notedOn)}. It is an indicative assessment of market value — not an offer, a
              guarantee, or a projection of future returns. Property values can fall as well as rise.{' '}
              RERA registration numbers available on request.
            </div>
            <div className="text-[9.5px] text-gray-500 dark:text-gray-400 leading-relaxed sm:text-right flex-shrink-0">
              <div className="font-bold text-gray-700 dark:text-gray-300">{u.entity}</div>
              <div>Ref. {stmtRef}</div>
              <div>System-generated — no signature required.</div>
            </div>
          </div>
        </div>
      </div>

      <Card title="Why this page is the whole platform" className="max-w-[790px] mx-auto mt-4 print:hidden">
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          This single page does three jobs. It is a <b>loyalty product</b> no builder in Gwalior currently
          gives. It is a <b>data-capture mechanism</b> that fills your empty birthday and anniversary
          fields without one form-filling drive. And it is a <b>re-investment pitch</b> that reframes "the
          flat I bought" into "the investment that returned {gainPct.toFixed(0)}%". Ship this before
          anything else on the platform — and pilot on 50, not 1,000, because every statement is also an
          invitation to audit your own ledger.
        </div>
      </Card>
    </>
  );
}
