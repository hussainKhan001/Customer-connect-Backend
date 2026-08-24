/* Server-side port of validateDraft() from the frontend's
   src/lib/intake.js — the authoritative check for POST /api/customers.
   The frontend keeps its own copy for instant feedback; this is what
   actually decides whether a record gets written. Uses this backend's
   own copy of core.js (see backend/src/lib/core.js). */
import { TODAY, TODAY_UTC_MIDNIGHT, fmtD, inrF, projByName, OCC, COMM } from './core.js';

/* the bulk-import sheet (see FULL_FORM_FIELDS in the frontend's
   intake.js) uses flat Yes/No text columns for booleans and consent,
   since a spreadsheet cell can't hold a nested object or a real
   boolean — this turns those into what validateProfilePatch expects
   before reusing its per-field checks below, rather than duplicating
   that validation here. */
function parseYesNo(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === '1';
}
export function normalizeProfileInput(d) {
  const out = { ...d };
  if (typeof out.coOnAgreement === 'string') out.coOnAgreement = parseYesNo(out.coOnAgreement);
  const consentKeys = ['consentWhatsapp', 'consentSms', 'consentEmail', 'consentMarketing', 'consentChildren'];
  if (consentKeys.some((k) => d[k] !== undefined) || d.consentPurpose !== undefined) {
    out.consent = {
      whatsapp: parseYesNo(d.consentWhatsapp), sms: parseYesNo(d.consentSms), email: parseYesNo(d.consentEmail),
      marketing: parseYesNo(d.consentMarketing), children: parseYesNo(d.consentChildren),
      purpose: d.consentPurpose,
    };
  }
  return out;
}

export function validateDraft(d, existingPans = []) {
  const e = {};
  if (!d.name || d.name.trim().length < 3) e.name = 'Enter the full name as it appears on the agreement.';

  const pan = (d.pan || '').replace(/\s/g, '');
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan)) {
    e.pan = 'PAN must be 5 letters, 4 digits, 1 letter — it is the primary dedupe key.';
  } else if (existingPans.some((p) => p.toUpperCase() === pan.toUpperCase())) {
    e.pan = 'Duplicate PAN — this owner already exists. Deduplicate on PAN first, never on name.';
  }

  if (!/^\+?[0-9\s]{10,14}$/.test(d.mobile || '')) e.mobile = 'Enter a 10-digit mobile — the secondary dedupe key.';
  if (!d.project || !projByName(d.project)) e.project = 'Choose the project so the valuation note can be attached.';
  if (!d.unit) e.unit = 'Unit number is required.';

  const sa = +d.saleable, rt = +d.rate, dc = +d.discount || 0, co = +d.consideration, pd = +d.paid;
  if (!(sa > 0)) e.saleable = 'Saleable area must be a positive number.';
  if (!(rt > 0)) e.rate = 'Booking rate must be a positive number.';
  if (!(co > 0)) e.consideration = 'Consideration is required.';
  if (sa > 0 && rt > 0 && co > 0 && Math.abs(rt * sa - dc - co) > 1) {
    e.consideration = 'Does not reconcile. rate × area − discount = ' + inrF(rt * sa - dc) +
      ', you entered ' + inrF(co) + '. Held rather than adjusted — the variance is either an unrecorded discount or an error.';
  }
  if (!d.bookDate) e.bookDate = 'Booking date is required.';
  else if (new Date(d.bookDate) > TODAY) e.bookDate = 'Booking date cannot be in the future.';
  if (!(pd >= 0)) e.paid = 'Received to date is required — enter 0 if nothing has been received.';
  else if (co > 0 && pd > co + 1) e.paid = 'Received exceeds consideration by ' + inrF(pd - co) + '. Rejected, not adjusted.';

  /* the extra full-profile columns (FULL_FORM_FIELDS) are all optional
     on create — reuse the exact same per-field checks the "Complete
     profile" endpoint already uses, rather than a second copy of them */
  const profile = validateProfilePatch(normalizeProfileInput(d));
  Object.assign(e, profile.errors);

  return e;
}

/* Port of buildCustomer() from src/lib/intake.js — takes a validated
   draft + a freshly-issued id and returns the raw Customer shape. Any
   of the FULL_FORM_FIELDS profile columns present in `d` (dob, email,
   consent, etc.) are applied via the same validateProfilePatch logic
   used for editing; anything not provided falls back to the original
   "not captured yet" defaults, unchanged from before those columns
   existed. */
export function buildCustomer(d, id) {
  const p = projByName(d.project);
  const bd = new Date(d.bookDate);
  const sa = +d.saleable, rt = +d.rate, dc = +d.discount || 0, co = +d.consideration, pd = +d.paid;

  const profile = validateProfilePatch(normalizeProfileInput(d)).patch;
  const captured = { dob: false, anniv: false, kid: false, occ: false, addr: false };
  if (profile.dob) captured.dob = true;
  if (profile.spouseDob) captured.anniv = true;
  if (profile.occupation) captured.occ = true;
  if (profile.corrAddr) captured.addr = true;
  const hasConsent = profile.consent && Object.entries(profile.consent).some(([k, v]) => k !== 'purpose' && v === true);

  return {
    id, status: 'ACTIVE', statusSince: bd, statusNote: null,
    salutation: d.salutation ? String(d.salutation).trim() : 'Mr.',
    name: d.name.trim(),
    coApplicant: profile.coApplicant ?? null, coRelation: profile.coRelation ?? 'Spouse', coOnAgreement: profile.coOnAgreement ?? false,
    dob: profile.dob ?? null, spouseDob: profile.spouseDob ?? null, children: [],
    pan: d.pan.replace(/\s/g, '').toUpperCase(), aadhaarHeld: false, kycDate: profile.kycDate ?? bd,
    mobile: d.mobile, email: profile.email ?? null,
    corrAddr: profile.corrAddr ?? 'Address not updated since booking', city: profile.city ?? 'Gwalior',
    occupation: profile.occupation ?? 'Not captured', occBand: profile.occBand ?? 50, incomeBand: profile.incomeBand ?? null,
    community: profile.community ?? 'Other',
    captured,
    consent: profile.consent
      ? { ...profile.consent, date: hasConsent ? TODAY : null }
      : { whatsapp: false, sms: false, email: false, marketing: false, date: null, purpose: null, children: false },
    source: d.source ? String(d.source).trim() : 'Direct walk-in', referredBy: null,
    units: [{
      unit: d.unit, project: p.name, entity: p.entity, type: '—',
      carpet: Math.round(sa * 0.68), saleable: sa, loading: 32,
      bookDate: bd, agrDate: null, regDate: null, possDate: null,
      rate: rt, discount: dc, consideration: co, paid: pd,
      receipts: 1, bounced: 0, lastReceipt: bd,
      loan: { bank: null, tenure: 0, start: null, closure: null, closed: true, prepaid: false, selfFunded: true },
      val: { ask: p.ask, resale: p.resale, circle: p.circle, notedOn: p.noted, basis: p.basis, by: p.by },
      exited: false,
    }],
    complaints: [], openComplaints: [], nps: null, npsDate: null, litigation: false,
    referrals: [], events: [], siteVisits: 0, portalLast: null, statements: [],
  };
}

/* Validates a PATCH /api/customers/:id body — the "complete profile"
   form, covering exactly the fields the Data Confidence checklist
   flags as missing (dob, anniversary, address, occupation, consent)
   plus the adjacent identity fields shown alongside them (co-applicant,
   email, city, community). Every key is optional — only keys present
   in the body are validated/applied, so the form can save one field
   at a time. Occupation is looked up against OCC so occBand/incomeBand
   (which drive the Capacity score) are always derived, never hand-typed. */
/* `opts.lenient` relaxes occupation/community from "must match the
   fixed list exactly" to "stored as free text if it doesn't" — used
   only by the shell/incomplete-record path (see validateIncomplete.js),
   where the source is a raw legacy list with real-world text like
   "Businessman ( Mustered oil )" rather than a themed <select> the
   user picked from. The strict "Complete profile" and "Add an owner"
   paths keep the hard match, since occBand/incomeBand feed the
   Capacity score and a picked-from-a-list value is what makes that
   trustworthy there. */
export function validateProfilePatch(d, opts = {}) {
  const e = {};
  const p = {};

  if (d.dob !== undefined) {
    const v = String(d.dob || '').trim();
    if (!v) p.dob = null;
    else {
      const dt = new Date(v);
      if (Number.isNaN(dt.getTime())) e.dob = 'Enter a valid date.';
      else if (dt > TODAY) e.dob = 'Date of birth cannot be in the future.';
      else p.dob = dt;
    }
  }

  if (d.spouseDob !== undefined) {
    const v = String(d.spouseDob || '').trim();
    if (!v) p.spouseDob = null;
    else {
      const dt = new Date(v);
      if (Number.isNaN(dt.getTime())) e.spouseDob = 'Enter a valid date.';
      else if (dt > TODAY) e.spouseDob = 'Anniversary date cannot be in the future.';
      else p.spouseDob = dt;
    }
  }

  if (d.email !== undefined) {
    const v = String(d.email || '').trim();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) e.email = 'Enter a valid email address.';
    else p.email = v || null;
  }

  if (d.kycDate !== undefined) {
    const v = String(d.kycDate || '').trim();
    if (!v) p.kycDate = null;
    else {
      const dt = new Date(v);
      if (Number.isNaN(dt.getTime())) e.kycDate = 'Enter a valid date.';
      else if (dt.getTime() > TODAY_UTC_MIDNIGHT) e.kycDate = `KYC date can't be after today (${fmtD(TODAY)}).`;
      else p.kycDate = dt;
    }
  }

  if (d.coApplicant !== undefined) p.coApplicant = String(d.coApplicant || '').trim() || null;
  if (d.coRelation !== undefined) p.coRelation = String(d.coRelation || '').trim() || 'Spouse';
  if (d.coOnAgreement !== undefined) p.coOnAgreement = !!d.coOnAgreement;

  if (d.corrAddr !== undefined) {
    const v = String(d.corrAddr || '').trim();
    if (v && v.length < 6) e.corrAddr = 'Enter the full current address.';
    else p.corrAddr = v || null;
  }
  if (d.city !== undefined) p.city = String(d.city || '').trim() || null;

  if (d.occupation !== undefined) {
    const v = String(d.occupation || '').trim();
    if (!v) p.occupation = null;
    else {
      const o = OCC.find((x) => x.k === v);
      if (o) { p.occupation = o.k; p.occBand = o.b; p.incomeBand = o.band; }
      else if (opts.lenient) p.occupation = v;
      else e.occupation = 'Choose an occupation from the list.';
    }
  }

  if (d.community !== undefined) {
    const v = String(d.community || '').trim();
    if (!v || COMM.includes(v)) p.community = v || null;
    else if (opts.lenient) p.community = v;
    else e.community = 'Choose a community from the list.';
  }

  if (d.consent !== undefined) {
    const cs = d.consent || {};
    p.consent = {
      whatsapp: !!cs.whatsapp, sms: !!cs.sms, email: !!cs.email, marketing: !!cs.marketing,
      children: !!cs.children, purpose: String(cs.purpose || '').trim() || null,
    };
  }

  return { errors: e, patch: p };
}
