/* =====================================================================
   DERIVED — position maths, the contact gate, data confidence, the
   propensity score and the segment. Every function here is pure: the
   weights are passed in, never read off a global.
   ===================================================================== */
import { D, TODAY, addD, yrs, daysTo, annivIn, nextFest, VAL_STALE_DAYS } from './core.js';

/* ---- one unit's position ---- */
export function unitCalc(u) {
  const v = Math.max(u.val.circle, u.val.resale);
  const cv = v * u.saleable;
  const gain = cv - u.consideration;
  const held = yrs(u.bookDate, u.exited ? u.exitDate : TODAY);
  return {
    ...u,
    valueRate: v, currentValue: cv, gain,
    gainPct: (gain / u.consideration) * 100,
    cagr: held > 0.5 ? (Math.pow(cv / u.consideration, 1 / held) - 1) * 100 : 0,
    heldYrs: held,
    outstanding: u.consideration - u.paid,
    paidPct: (u.paid / u.consideration) * 100,
    ltcg: new Date(D(u.bookDate).getFullYear() + 2, D(u.bookDate).getMonth(), D(u.bookDate).getDate()),
    valStale: daysTo(u.val.notedOn) < -VAL_STALE_DAYS,
  };
}

/* ---- rollup across every unit an owner holds, in any entity ---- */
export function roll(c) {
  const all = c.units.map(unitCalc);
  const live = all.filter((u) => !u.exited);
  const S = (a, k) => a.reduce((s, u) => s + u[k], 0);
  return {
    all, units: live,
    consideration: S(live, 'consideration'),
    paid: S(live, 'paid'),
    outstanding: S(live, 'outstanding'),
    value: S(live, 'currentValue'),
    gain: S(live, 'gain'),
  };
}

/* ---- contact gate — evaluated in strict order, first match wins ---- */
export const GATE_ORDER = [
  ['OWNER_EXITED', 'Owner has exited', (c) => c.status === 'EXITED',
    'No longer an owner — the unit was sold on the open market. Every outbound list must exclude this record. A portfolio statement here would be a serious error.'],
  ['TRANSFER_IN_PROGRESS', 'Transfer or succession in progress', (c) => c.status === 'TRANSFER_IN_PROGRESS' || c.status === 'DECEASED',
    'Ownership is being transferred to the nominee. No marketing, no greetings, no statements until transfer completes and the nominee gives fresh consent.'],
  ['LITIGATION', 'Litigation flag', (c) => c.litigation,
    'Litigation flag set. Legal clearance required before any contact.'],
  ['OPEN_COMPLAINT', 'Open service complaint', (c) => c.openComplaints.length > 0, null],
  ['NO_MARKETING_CONSENT', 'No marketing consent under DPDP', (c) => !c.consent.marketing,
    'Marketing consent not on record. Service and transactional messages only. This is a legal block, not a preference.'],
  ['STALE_VALUATION', 'Valuation note out of date',
    (c) => c.units.some((u) => !u.exited && daysTo(u.val.notedOn) < -VAL_STALE_DAYS),
    'The valuation note for this project is more than 90 days old. A gain figure computed on stale evidence must not be shown to a customer.'],
];

export function gate(c) {
  for (const [code, label, test, why] of GATE_ORDER) {
    if (test(c)) {
      if (code === 'OPEN_COMPLAINT') {
        const o = c.openComplaints[0];
        return {
          open: false, code, label,
          why: 'Open complaint ageing ' + o.days + ' days (' + o.ncr + ', owner: ' + o.owner +
               '). Sales and marketing outbound suppressed until service closes it. The record returns to outreach automatically on closure.',
        };
      }
      return { open: false, code, label, why };
    }
  }
  return {
    open: true, code: 'OPEN', label: 'No block',
    why: 'Marketing consent on record, no open service issue, valuation current.',
  };
}

/* ---- is this record clean enough to put in front of a customer ---- */
export function confidence(c) {
  const checks = [
    ['Identity verified — PAN and KYC', !!c.pan && !!c.kycDate],
    ['Mobile on record', !!c.mobile],
    ['Address updated since booking', !c.corrAddr.includes('not updated')],
    ['Owner status confirmed active', c.status === 'ACTIVE'],
    ['Paid-to-date within consideration', c.units.every((u) => u.paid <= u.consideration)],
    ['Registry on record for every possessed unit', c.units.every((u) => !u.possDate || !!u.regDate)],
    ['Valuation note dated within 90 days', c.units.every((u) => u.exited || daysTo(u.val.notedOn) >= -VAL_STALE_DAYS)],
    ['DPDP consent recorded', !!c.consent.date],
    ['Date of birth captured', c.captured.dob],
    ['Anniversary captured', c.captured.anniv || !c.coApplicant],
  ];
  const pass = checks.filter((x) => x[1]).length;
  return { checks, pass, total: checks.length, pct: Math.round((pass / checks.length) * 100) };
}

export const DEFAULT_W = { capacity: 40, trust: 25, timing: 20, engagement: 15 };
export const TRUST_HEAVY_W = { capacity: 25, trust: 45, timing: 15, engagement: 15 };

export function score(c, W = DEFAULT_W) {
  const r = roll(c);
  if (!r.units.length) return { capacity: 0, trust: 0, timing: 0, engagement: 0, total: 0 };

  const paidPct = r.paid / r.consideration;
  const closed = r.units.every((u) => u.loan.closed || u.loan.selfFunded);
  const prepay = r.units.some((u) => u.loan.prepaid);
  const capacity = Math.min(100,
    paidPct * 30 + (closed ? 25 : prepay ? 15 : 6) + Math.min(1, r.gain / 4000000) * 25 + (c.occBand / 100) * 20);

  const bounced = r.units.reduce((s, u) => s + u.bounced, 0);
  const trust = Math.max(0, Math.min(100,
    (c.openComplaints.length ? 0 : 35) + ((c.nps || 5) / 10) * 30 + (25 - bounced * 4) + (c.litigation ? 0 : 10)));

  const held = Math.max(...r.units.map((u) => u.heldYrs));
  const cands = [
    c.captured.dob ? annivIn(c.dob) : null,
    c.captured.anniv ? annivIn(c.spouseDob) : null,
    ...r.units.map((u) => annivIn(u.bookDate)),
  ].filter((x) => x != null);
  const trig = cands.length ? Math.min(...cands) : 999;
  const nf = nextFest();
  const timing = Math.min(100,
    (held >= 2 ? 30 : (held / 2) * 30) + (closed ? 25 : prepay ? 15 : 5) +
    (trig <= 45 ? 25 : trig <= 90 ? 14 : 5) + (nf && nf.days <= 60 ? 20 : nf && nf.days <= 120 ? 11 : 4));

  const engagement = Math.min(100,
    Math.min(1, c.referrals.length / 4) * 40 + Math.min(1, c.events.length / 3) * 30 +
    Math.min(1, c.siteVisits / 4) * 20 + (c.portalLast ? 10 : 0));

  const t = W.capacity + W.trust + W.timing + W.engagement;
  return {
    capacity, trust, timing, engagement,
    total: Math.round((capacity * W.capacity + trust * W.trust + timing * W.timing + engagement * W.engagement) / t),
  };
}

export function segOf(c, W = DEFAULT_W, g = gate(c), s = score(c, W)) {
  if (!g.open) return 'C';
  if (s.total >= 76) return 'A';
  if (s.trust >= 65 && s.capacity < 50) return 'D';
  return s.total >= 50 ? 'B' : 'D';
}

export const SEGLBL = {
  A: 'A · Ready to re-invest', B: 'B · Nurture',
  C: 'C · Repair first', D: 'D · Referral only',
};
export const SEGMETA = {
  A: { w: 'Score 76+, clean service record, capacity present.', o: 'Owner: CEO / GM — personal call only' },
  B: { w: 'Right relationship, wrong moment. Capacity or timing still building.', o: 'Owner: CRM — quarterly statement + events' },
  C: { w: 'Blocked by the gate. Sales outreach is locked until it clears.', o: 'Owner: Service, Legal or CRM' },
  D: { w: 'High trust, no capacity. They cannot buy — they can bring buyers.', o: 'Owner: CRM — referral programme' },
};
export const STATUSLBL = {
  ACTIVE: 'Active owner',
  EXITED: 'Exited — no longer an owner',
  TRANSFER_IN_PROGRESS: 'Transfer in progress',
  DECEASED: 'Deceased — transfer pending',
};

/* What the segment chip actually says — the gate reason outranks the score */
export function segDisplay(c) {
  const g = c._g;
  if (g.code === 'OWNER_EXITED') return { cls: 'r', t: 'Out of scope — exited' };
  if (g.code === 'TRANSFER_IN_PROGRESS') return { cls: 'r', t: 'Out of scope — transfer pending' };
  if (g.code === 'LITIGATION') return { cls: 'r', t: 'C · Legal hold' };
  if (g.code === 'NO_MARKETING_CONSENT') return { cls: 'w', t: 'Service contact only' };
  if (g.code === 'STALE_VALUATION') return { cls: 'w', t: 'Held — valuation stale' };
  return { cls: c._seg, t: SEGLBL[c._seg] };
}

/* ---- enrich: attach every derived field, re-run on any weight change ---- */
export function enrich(base, W) {
  return base.map((c) => {
    const s = score(c, W);
    const g = gate(c);
    const r = roll(c);
    return {
      ...c,
      _s: s, _total: s.total, _seg: segOf(c, W, g, s), _g: g, _blocked: !g.open,
      _gain: r.gain, _value: r.value, _consid: r.consideration, _paid: r.paid,
      _out: r.outstanding, _live: r.units.length, _conf: confidence(c).pct,
      _rate: r.units.length ? r.units[0].rate : 0,
      _vrate: r.units.length ? r.units[0].valueRate : 0,
      _project: c.units[0].project, _unit: c.units[0].unit, _book: c.units[0].bookDate,
      _held: r.units.length ? Math.max(...r.units.map((u) => u.heldYrs)) : 0,
      _paidPct: r.consideration ? (r.paid / r.consideration) * 100 : 0,
    };
  });
}

/* ---- dated reasons to make contact, gate applied ---- */
/* `incompleteBase` (raw, unenriched shell records — no PAN/confirmed
   financials) contributes personal triggers only. A birthday or
   anniversary is real and worth a call regardless of whether KYC is
   done; a portfolio trigger (booking anniversary, loan closure, LTCG
   window) genuinely can't be computed without real unit financials,
   so those stay complete-owners-only rather than running unitCalc()
   on nulls and producing a meaningless date. */
export function triggerList(base, incompleteBase = []) {
  const out = [];
  base.forEach((c) => {
    if (c._blocked) return;
    const add = (d, label, kind) => { if (d >= 0 && d <= 90) out.push({ c, days: d, label, kind }); };
    if (c.captured.dob) add(annivIn(c.dob), 'Birthday', 'personal');
    if (c.captured.anniv && c.spouseDob) add(annivIn(c.spouseDob), 'Wedding anniversary', 'personal');
    c.units.filter((u) => !u.exited).forEach((u) => {
      add(annivIn(u.bookDate), 'Booking anniversary — year ' + Math.max(1, TODAY.getFullYear() - D(u.bookDate).getFullYear()), 'portfolio');
      if (u.regDate) add(annivIn(u.regDate), 'Registry anniversary', 'portfolio');
      if (!u.loan.closed && u.loan.closure) add(daysTo(u.loan.closure), 'Home loan closes — EMI capacity frees up', 'money');
      add(daysTo(new Date(D(u.bookDate).getFullYear() + 2, D(u.bookDate).getMonth(), D(u.bookDate).getDate())),
        'Completes 24 months — LTCG / 54F window opens', 'money');
    });
  });
  incompleteBase.forEach((c) => {
    const add = (d, label, kind) => { if (d >= 0 && d <= 90) out.push({ c, days: d, label, kind }); };
    if (c.captured.dob) add(annivIn(c.dob), 'Birthday', 'personal');
    if (c.captured.anniv && c.spouseDob) add(annivIn(c.spouseDob), 'Wedding anniversary', 'personal');
  });
  return out.sort((a, b) => a.days - b.days || (b.c._total ?? 0) - (a.c._total ?? 0));
}

/* ---- per-owner document vault ---- */
/* `key` is a stable identifier for each row, used to match an actual
   uploaded file (c.documents[]) to the checklist row it belongs to —
   independent of whether the underlying milestone date is set, since a
   scanned copy and a recorded date are two different questions. */
export function docsFor(c) {
  const d = [];
  c.units.forEach((u) => {
    d.push({ key: `allotment-${u.unit}`, n: 'Allotment letter — ' + u.unit, d: addD(u.bookDate, 7), ok: true });
    d.push({ key: `agreement-${u.unit}`, n: 'Sale agreement — ' + u.unit, d: u.agrDate, ok: !!u.agrDate });
    d.push({ key: `registry-${u.unit}`, n: 'Registered sale deed — ' + u.unit, d: u.regDate, ok: !!u.regDate });
    if (u.possDate) d.push({ key: `possession-${u.unit}`, n: 'Possession certificate — ' + u.unit, d: u.possDate, ok: true });
    if (u.exited) d.push({ key: `transfer-${u.unit}`, n: 'Transfer deed (third party) — ' + u.unit, d: u.exitDate, ok: true });
  });
  d.push({ key: 'kyc', n: 'KYC — PAN and Aadhaar', d: c.kycDate, ok: !!c.kycDate });
  if (c.status === 'TRANSFER_IN_PROGRESS') {
    d.push({ key: 'succession', n: 'Succession / transfer papers', d: null, ok: false });
    d.push({ key: 'kyc-nominee', n: 'KYC — nominee', d: null, ok: false });
  }
  return d;
}

/* ---- every touch, by name, newest first ---- */
export function activityFor(c) {
  const a = [];
  c.units.forEach((u) => {
    a.push({ d: u.bookDate, w: 'Sales', t: 'Booked ' + u.unit + ' at ₹' + u.rate.toLocaleString('en-IN') + ' per sq.ft.', by: 'Sales' });
    if (u.regDate) a.push({ d: u.regDate, w: 'Legal', t: 'Registry completed — ' + u.unit, by: 'Legal' });
    if (u.loan.closedOn) a.push({ d: u.loan.closedOn, w: 'Finance', t: u.loan.bank + ' loan on ' + u.unit + (u.loan.prepaid ? ' foreclosed by customer' : ' closed on schedule'), by: 'Bank feed' });
    if (u.exited) a.push({ d: u.exitDate, w: 'System', t: 'Owner status changed to Exited. Unit resold on the open market at approx. ₹' + u.exitRate.toLocaleString('en-IN') + '/sq.ft.', by: 'Legal' });
  });
  if (c.consent.date) a.push({ d: c.consent.date, w: 'Consent', t: 'DPDP consent recorded — marketing ' + (c.consent.marketing ? 'granted' : 'DECLINED'), by: 'CRM' });
  if (c.nps) a.push({ d: c.npsDate, w: 'Survey', t: 'NPS captured — ' + c.nps + '/10', by: 'CRM' });
  c.openComplaints.forEach((o) => {
    a.push({ d: o.raised, w: 'Service', t: 'Complaint raised — ' + o.t + '. ' + o.ncr + ' opened.', by: 'CRM' });
    a.push({ d: o.raised, w: 'System', t: 'Contact gate CLOSED — all sales and marketing outbound suppressed', by: 'System' });
  });
  c.referrals.forEach((r) => a.push({ d: r.date, w: 'Referral', t: 'Referred ' + r.n + ' — ' + r.status, by: 'Sales' }));
  c.events.forEach((e) => a.push({ d: e.d, w: 'Event', t: 'Attended ' + e.n, by: 'CRM' }));
  (c.calls || []).forEach((call) => a.push({
    d: call.date, w: 'Call', t: 'Call — ' + call.outcome + (call.note ? ': ' + call.note : ''), by: call.by || 'CRM',
  }));
  c.statements.forEach((s) => a.push({
    d: s.d, w: 'Statement',
    t: 'Portfolio statement ' + s.v + ' sent via ' + s.ch +
       (s.disputed ? ' — FIGURE DISPUTED by customer' : s.profileDone ? ' — profile completed' : ''),
    by: 'CRM',
  }));
  if (c.portalLast) a.push({ d: c.portalLast, w: 'Customer', t: 'Logged into owner portal', by: '—' });
  return a.sort((x, y) => D(y.d) - D(x.d)).slice(0, 16);
}
