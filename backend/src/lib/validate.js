/* Server-side port of validateDraft() from the frontend's
   src/lib/intake.js — the authoritative check for POST /api/customers.
   The frontend keeps its own copy for instant feedback; this is what
   actually decides whether a record gets written. Uses this backend's
   own copy of core.js (see backend/src/lib/core.js). */
import { TODAY, inrF, projByName } from './core.js';

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

  return e;
}

/* Port of buildCustomer() from src/lib/intake.js — takes a validated
   draft + a freshly-issued id and returns the raw Customer shape. */
export function buildCustomer(d, id) {
  const p = projByName(d.project);
  const bd = new Date(d.bookDate);
  const sa = +d.saleable, rt = +d.rate, dc = +d.discount || 0, co = +d.consideration, pd = +d.paid;
  return {
    id, status: 'ACTIVE', statusSince: bd, statusNote: null,
    salutation: 'Mr.', name: d.name.trim(), coApplicant: null, coRelation: 'Spouse', coOnAgreement: false,
    dob: null, spouseDob: null, children: [],
    pan: d.pan.replace(/\s/g, '').toUpperCase(), aadhaarHeld: false, kycDate: bd,
    mobile: d.mobile, email: null,
    corrAddr: 'Address not updated since booking', city: 'Gwalior',
    occupation: 'Not captured', occBand: 50, incomeBand: null, community: 'Other',
    captured: { dob: false, anniv: false, kid: false, occ: false, addr: false },
    consent: { whatsapp: false, sms: false, email: false, marketing: false, date: null, purpose: null, children: false },
    source: 'Direct walk-in', referredBy: null,
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
