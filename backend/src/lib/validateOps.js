/* Validators for the operational-write endpoints added after "Complete
   profile": owner status, litigation, complaints, per-unit loan/
   valuation, NPS, referrals, events, site visits, exit. Kept separate
   from validate.js (create + profile-patch) since these are a distinct
   concern — every field here either flips the Contact Gate (status,
   litigation, openComplaints) or feeds a Score pillar (see derived.js),
   never both invented nor left unvalidated.

   All "not in the future" checks compare against this app's fixed
   TODAY (backend/src/lib/core.js), not real wall-clock time, so a
   freshly-logged record never looks like it happened days ahead of
   the app's own "today". */
import { TODAY, TODAY_UTC_MIDNIGHT, fmtD } from './core.js';

export const STATUSES = ['ACTIVE', 'EXITED', 'TRANSFER_IN_PROGRESS', 'DECEASED'];
export const REFERRAL_STATUSES = ['Booked', 'Open — no follow-up logged', 'Lost — budget'];
export const CALL_OUTCOMES = [
  'Interested — follow up', 'Not interested', 'No answer', 'Call back later', 'Converted — re-invested',
];

/* This app's "today" is a fixed date, not the real calendar date — a
   plain "can't be in the future" message is confusing when the date
   picker's own browser default is the real today. Naming the app's
   actual today makes clear what the rule is comparing against. */
function parseDateNotFuture(v, label) {
  const s = String(v || '').trim();
  if (!s) return { error: `${label} is required.` };
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return { error: `Enter a valid date for ${label}.` };
  if (dt.getTime() > TODAY_UTC_MIDNIGHT) return { error: `${label} can't be after today (${fmtD(TODAY)}).` };
  return { date: dt };
}

function parseUnitKey(d) {
  const unit = String(d.unit || '').trim();
  const project = String(d.project || '').trim();
  if (!unit || !project) return { error: 'Missing unit reference — reload and try again.' };
  return { unit, project };
}

/* 409-worthy: the loaded document's item at the client-supplied array
   index doesn't match the natural key the client last saw there —
   someone else's edit shifted the array in between. */
export function matchUnit(unit, key) {
  return !!unit && unit.unit === key.unit && unit.project === key.project;
}
export function matchComplaint(item, ncr) {
  return !!item && item.ncr === ncr;
}

export function validateStatusPatch(d) {
  const e = {};
  const status = String(d.status || '').trim();
  if (!STATUSES.includes(status)) e.status = 'Choose a valid status.';
  const statusNote = String(d.statusNote || '').trim();
  if (status !== 'ACTIVE' && !statusNote) {
    e.statusNote = 'Explain the change — required for anything other than Active.';
  }
  if (Object.keys(e).length) return { errors: e, patch: null };
  return { errors: {}, patch: { status, statusNote: statusNote || null } };
}

export function validateLitigationPatch(d) {
  return { errors: {}, patch: { litigation: !!d.litigation } };
}

export function validateComplaintOpen(d) {
  const e = {};
  const t = String(d.t || '').trim();
  const owner = String(d.owner || '').trim();
  const ncr = String(d.ncr || '').trim();
  if (!t) e.t = 'Describe the complaint.';
  if (!owner) e.owner = 'Name who owns the fix.';
  if (!ncr) e.ncr = 'Enter the NCR reference.';
  const r = parseDateNotFuture(d.raised, 'Raised date');
  if (r.error) e.raised = r.error;
  if (Object.keys(e).length) return { errors: e, patch: null };
  const days = Math.max(0, Math.round((TODAY - r.date) / 86400000));
  return { errors: {}, patch: { t, owner, ncr, raised: r.date, days } };
}

export function validateComplaintClose(d) {
  const ncr = String(d.ncr || '').trim();
  if (!ncr) return { errors: { ncr: 'Missing complaint reference — reload and try again.' }, patch: null };
  return { errors: {}, patch: { ncr } };
}

export function validateLoanPatch(d) {
  const e = {};
  const key = parseUnitKey(d);
  if (key.error) e.unit = key.error;

  const p = {};
  if (d.bank !== undefined) p.bank = String(d.bank || '').trim() || null;
  if (d.tenure !== undefined) {
    const s = String(d.tenure || '').trim();
    if (!s) p.tenure = 0;
    else {
      const n = Number(s);
      if (Number.isNaN(n) || n < 0) e.tenure = 'Enter a valid tenure in years.';
      else p.tenure = n;
    }
  }
  ['start', 'closure', 'closedOn'].forEach((k) => {
    if (d[k] === undefined) return;
    const s = String(d[k] || '').trim();
    if (!s) { p[k] = null; return; }
    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) e[k] = 'Enter a valid date.';
    else p[k] = dt;
  });
  if (d.prepaid !== undefined) p.prepaid = !!d.prepaid;
  if (d.selfFunded !== undefined) p.selfFunded = !!d.selfFunded;
  if (d.closed !== undefined) p.closed = !!d.closed;

  if (Object.keys(e).length) return { errors: e, patch: null, key: null };
  return { errors: {}, patch: p, key };
}

export function validateValuationPatch(d) {
  const e = {};
  const key = parseUnitKey(d);
  if (key.error) e.unit = key.error;

  const p = {};
  ['ask', 'resale', 'circle'].forEach((k) => {
    if (d[k] === undefined) return;
    const n = Number(d[k]);
    if (!(n > 0)) e[k] = 'Enter a positive rate.';
    else p[k] = n;
  });
  if (d.notedOn !== undefined) {
    const r = parseDateNotFuture(d.notedOn, 'Note dated');
    if (r.error) e.notedOn = r.error;
    else p.notedOn = r.date.toISOString().slice(0, 10);
  }
  if (d.basis !== undefined) {
    const v = String(d.basis || '').trim();
    if (!v) e.basis = 'State the basis for this note.';
    else p.basis = v;
  }
  if (d.by !== undefined) {
    const v = String(d.by || '').trim();
    if (!v) e.by = 'Name who signed this note.';
    else p.by = v;
  }

  if (Object.keys(e).length) return { errors: e, patch: null, key: null };
  return { errors: {}, patch: p, key };
}

export function validateNpsPatch(d) {
  const e = {};
  const n = Number(d.nps);
  if (!(Number.isInteger(n) && n >= 0 && n <= 10)) e.nps = 'NPS must be a whole number from 0 to 10.';
  const r = parseDateNotFuture(d.npsDate, 'NPS date');
  if (r.error) e.npsDate = r.error;
  if (Object.keys(e).length) return { errors: e, patch: null };
  return { errors: {}, patch: { nps: n, npsDate: r.date } };
}

export function validateReferralPatch(d) {
  const e = {};
  const n = String(d.n || '').trim();
  if (!n) e.n = "Enter the referred person's name.";
  const status = String(d.status || '').trim();
  if (!REFERRAL_STATUSES.includes(status)) e.status = 'Choose a valid status.';
  const r = parseDateNotFuture(d.date, 'Referral date');
  if (r.error) e.date = r.error;
  if (Object.keys(e).length) return { errors: e, patch: null };
  return { errors: {}, patch: { n, status, date: r.date } };
}

export function validateEventPatch(d) {
  const e = {};
  const n = String(d.n || '').trim();
  if (!n) e.n = 'Enter the event name.';
  const r = parseDateNotFuture(d.d, 'Event date');
  if (r.error) e.d = r.error;
  if (Object.keys(e).length) return { errors: e, patch: null };
  return { errors: {}, patch: { n, d: r.date } };
}

/* the result of a call made off the Trigger Calendar — this is the
   piece that was missing before outcome data exists anywhere to re-fit
   the score weights against (see Activity log's footer note). */
export function validateCallPatch(d) {
  const e = {};
  const outcome = String(d.outcome || '').trim();
  if (!CALL_OUTCOMES.includes(outcome)) e.outcome = 'Choose a valid outcome.';
  const note = String(d.note || '').trim();
  const r = parseDateNotFuture(d.date, 'Call date');
  if (r.error) e.date = r.error;
  if (Object.keys(e).length) return { errors: e, patch: null };
  return { errors: {}, patch: { outcome, note: note || null, date: r.date } };
}

/* Agreement / registry / possession dates — these are what the
   Document Vault checklist (frontend derived.js docsFor()) actually
   reads to decide "Sale agreement" / "Registered sale deed" /
   "Possession certificate" are on file; there's no separate document/
   file record anywhere in this app, just these three dates. */
export function validateMilestonesPatch(d) {
  const e = {};
  const key = parseUnitKey(d);
  if (key.error) e.unit = key.error;

  const p = {};
  ['agrDate', 'regDate', 'possDate'].forEach((k) => {
    if (d[k] === undefined) return;
    const s = String(d[k] || '').trim();
    if (!s) { p[k] = null; return; }
    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) e[k] = 'Enter a valid date.';
    else if (dt.getTime() > TODAY_UTC_MIDNIGHT) e[k] = `Can't be after today (${fmtD(TODAY)}).`;
    else p[k] = dt;
  });

  if (Object.keys(e).length) return { errors: e, patch: null, key: null };
  return { errors: {}, patch: p, key };
}

export function validateExitPatch(d) {
  const e = {};
  const key = parseUnitKey(d);
  if (key.error) e.unit = key.error;
  const r = parseDateNotFuture(d.exitDate, 'Exit date');
  if (r.error) e.exitDate = r.error;
  const rate = Number(d.exitRate);
  if (!(rate > 0)) e.exitRate = 'Enter a positive exit rate.';

  if (Object.keys(e).length) return { errors: e, patch: null, key: null };
  return { errors: {}, patch: { exitDate: r.date, exitRate: rate }, key };
}
