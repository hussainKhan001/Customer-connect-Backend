/* "Shell" owner records — created from a raw allotment/inventory list
   (name, mobile, project, unit) that has no PAN and/or no confirmed
   unit financials yet. Deliberately a SEPARATE, more permissive path
   from validateDraft/buildCustomer in validate.js — that one enforces
   "reject, don't guess" for a booking-form-complete record; this one
   exists precisely because a legacy migration often doesn't have that
   yet, and forcing a fake PAN or a guessed rate to satisfy the strict
   path would corrupt the one thing (PAN) everything else dedupes on. */
import { TODAY, projByName } from './core.js';
import { validateProfilePatch, normalizeProfileInput } from './validate.js';

/* the single source of truth for whether a customer is still a shell —
   always recomputed from the real fields, never trusted from a client-
   supplied flag, so it can't drift out of sync with reality. */
export function computeIncomplete(pan, unit) {
  if (!pan) return true;
  if (!unit) return true;
  if (!(unit.saleable > 0)) return true;
  if (!(unit.rate > 0)) return true;
  if (!(unit.consideration > 0)) return true;
  if (!unit.bookDate) return true;
  return false;
}

/* only name/mobile/project/unit are mandatory — everything else is
   optional, but validated if present (a half-entered PAN or a
   reconciliation mismatch is still rejected, never guessed at). */
export function validateShellDraft(d, existingPans = []) {
  const e = {};
  if (!d.name || d.name.trim().length < 3) e.name = 'Enter the full name as it appears on the agreement.';
  if (!/^\+?[0-9\s]{10,14}$/.test(d.mobile || '')) e.mobile = 'Enter a 10-digit mobile.';
  if (!d.project || !projByName(d.project)) e.project = 'Choose the project so the valuation note can be attached.';
  if (!d.unit) e.unit = 'Unit number is required.';

  const pan = (d.pan || '').replace(/\s/g, '');
  if (pan) {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan)) {
      e.pan = 'PAN must be 5 letters, 4 digits, 1 letter, or leave it blank until known.';
    } else if (existingPans.some((p) => p.toUpperCase() === pan.toUpperCase())) {
      e.pan = 'Duplicate PAN — this owner already exists. Deduplicate on PAN first, never on name.';
    }
  }

  const sa = d.saleable !== undefined && d.saleable !== '' ? +d.saleable : null;
  const rt = d.rate !== undefined && d.rate !== '' ? +d.rate : null;
  const dc = +d.discount || 0;
  const co = d.consideration !== undefined && d.consideration !== '' ? +d.consideration : null;
  const pd = d.paid !== undefined && d.paid !== '' ? +d.paid : null;

  if (sa !== null && !(sa > 0)) e.saleable = 'Saleable area must be a positive number, or leave it blank.';
  if (rt !== null && !(rt > 0)) e.rate = 'Booking rate must be a positive number, or leave it blank.';
  if (co !== null && !(co > 0)) e.consideration = 'Consideration must be a positive number, or leave it blank.';
  if (sa !== null && rt !== null && co !== null && Math.abs(rt * sa - dc - co) > 1) {
    e.consideration = 'Does not reconcile with rate × area − discount. Leave consideration blank rather than guess it.';
  }
  if (d.bookDate) {
    if (Number.isNaN(new Date(d.bookDate).getTime())) e.bookDate = 'Enter a valid date, or leave it blank.';
    else if (new Date(d.bookDate) > TODAY) e.bookDate = 'Booking date cannot be in the future.';
  }
  if (pd !== null && !(pd >= 0)) e.paid = 'Received to date must be zero or more, or leave it blank.';

  const profile = validateProfilePatch(normalizeProfileInput(d));
  Object.assign(e, profile.errors);

  return e;
}

/* mirrors buildCustomer() in validate.js but leaves pan/saleable/rate/
   discount/consideration/bookDate/paid null wherever the draft didn't
   provide them, instead of defaulting to a value that would look like
   real, confirmed data. */
export function buildShellCustomer(d, id) {
  const p = projByName(d.project);
  const bd = d.bookDate ? new Date(d.bookDate) : null;
  const sa = d.saleable !== undefined && d.saleable !== '' ? +d.saleable : null;
  const rt = d.rate !== undefined && d.rate !== '' ? +d.rate : null;
  const dc = d.discount !== undefined && d.discount !== '' ? +d.discount : 0;
  const co = d.consideration !== undefined && d.consideration !== '' ? +d.consideration : null;
  const pd = d.paid !== undefined && d.paid !== '' ? +d.paid : 0;
  const pan = d.pan ? d.pan.replace(/\s/g, '').toUpperCase() : null;

  const profile = validateProfilePatch(normalizeProfileInput(d)).patch;
  const captured = { dob: false, anniv: false, kid: false, occ: false, addr: false };
  if (profile.dob) captured.dob = true;
  if (profile.spouseDob) captured.anniv = true;
  if (profile.occupation) captured.occ = true;
  if (profile.corrAddr) captured.addr = true;
  const hasConsent = profile.consent && Object.entries(profile.consent).some(([k, v]) => k !== 'purpose' && v === true);

  const unit = {
    unit: d.unit, project: p.name, entity: p.entity, type: '—',
    carpet: sa != null ? Math.round(sa * 0.68) : null, saleable: sa, loading: 32,
    bookDate: bd, agrDate: null, regDate: null, possDate: null,
    rate: rt, discount: dc, consideration: co, paid: pd,
    receipts: pd > 0 ? 1 : 0, bounced: 0, lastReceipt: bd,
    loan: { bank: null, tenure: 0, start: null, closure: null, closed: true, prepaid: false, selfFunded: true },
    val: { ask: p.ask, resale: p.resale, circle: p.circle, notedOn: p.noted, basis: p.basis, by: p.by },
    exited: false,
  };

  return {
    id, status: 'ACTIVE', statusSince: bd || TODAY, statusNote: null,
    salutation: d.salutation ? String(d.salutation).trim() : 'Mr.',
    name: d.name.trim(),
    coApplicant: profile.coApplicant ?? null, coRelation: profile.coRelation ?? 'Spouse', coOnAgreement: profile.coOnAgreement ?? false,
    dob: profile.dob ?? null, spouseDob: profile.spouseDob ?? null, children: [],
    pan, aadhaarHeld: false, kycDate: profile.kycDate ?? null,
    mobile: d.mobile, email: profile.email ?? null,
    corrAddr: profile.corrAddr ?? 'Address not updated since booking', city: profile.city ?? 'Gwalior',
    occupation: profile.occupation ?? 'Not captured', occBand: profile.occBand ?? 50, incomeBand: profile.incomeBand ?? null,
    community: profile.community ?? 'Other',
    captured,
    consent: profile.consent
      ? { ...profile.consent, date: hasConsent ? TODAY : null }
      : { whatsapp: false, sms: false, email: false, marketing: false, date: null, purpose: null, children: false },
    source: d.source ? String(d.source).trim() : 'Direct walk-in', referredBy: null,
    units: [unit],
    complaints: [], openComplaints: [], nps: null, npsDate: null, litigation: false,
    referrals: [], events: [], siteVisits: 0, portalLast: null, statements: [],
    incomplete: computeIncomplete(pan, unit),
  };
}

/* PATCH /api/customers/:id/complete — fills in the fields a shell
   record was missing. Every field here is now mandatory (this is the
   moment a shell becomes a real, scoreable customer), reusing the same
   rules as the strict create path. */
export function validateCompletion(d, existingPans = []) {
  const e = {};
  const pan = (d.pan || '').replace(/\s/g, '');
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan)) {
    e.pan = 'PAN must be 5 letters, 4 digits, 1 letter — it is the primary dedupe key.';
  } else if (existingPans.some((p) => p.toUpperCase() === pan.toUpperCase())) {
    e.pan = 'Duplicate PAN — this owner already exists. Deduplicate on PAN first, never on name.';
  }

  const sa = +d.saleable, rt = +d.rate, dc = +d.discount || 0, co = +d.consideration, pd = +d.paid;
  if (!(sa > 0)) e.saleable = 'Saleable area must be a positive number.';
  if (!(rt > 0)) e.rate = 'Booking rate must be a positive number.';
  if (!(co > 0)) e.consideration = 'Consideration is required.';
  if (sa > 0 && rt > 0 && co > 0 && Math.abs(rt * sa - dc - co) > 1) {
    e.consideration = `Does not reconcile. rate × area − discount = ${rt * sa - dc}, you entered ${co}.`;
  }
  if (!d.bookDate) e.bookDate = 'Booking date is required.';
  else if (new Date(d.bookDate) > TODAY) e.bookDate = 'Booking date cannot be in the future.';
  if (!(pd >= 0)) e.paid = 'Received to date is required — enter 0 if nothing has been received.';
  else if (co > 0 && pd > co + 1) e.paid = `Received exceeds consideration by ${pd - co}. Rejected, not adjusted.`;

  if (Object.keys(e).length) return { errors: e, patch: null };
  return {
    errors: {},
    patch: {
      pan: pan.toUpperCase(),
      unit: { saleable: sa, rate: rt, discount: dc, consideration: co, paid: pd, bookDate: new Date(d.bookDate) },
    },
  };
}
