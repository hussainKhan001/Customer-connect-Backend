/* =====================================================================
   INTAKE — the write path. Import validation, the exceptions queue, and
   the live form. Reject rather than guess: a row that does not
   reconcile is held, never adjusted.
   ===================================================================== */
import { TODAY, daysTo, inrF, projByName, PROJECTS, VAL_STALE_DAYS } from './core.js';

export const CHECKS = [
  ['RATE_AREA', 'Rate × area less discount equals consideration',
    (c) => c.units.every((u) => Math.abs(u.rate * u.saleable - u.discount - u.consideration) < 1)],
  ['PAID_LE_CONSID', 'Paid-to-date does not exceed consideration',
    (c) => c.units.every((u) => u.paid <= u.consideration + 1)],
  ['REG_ON_POSSESSION', 'Registry recorded for every possessed unit',
    (c) => c.units.every((u) => !u.possDate || !!u.regDate)],
  ['DATE_ORDER', 'Booking ≤ agreement ≤ registry ≤ possession',
    (c) => c.units.every((u) => {
      const a = [u.bookDate, u.agrDate, u.regDate, u.possDate].filter(Boolean).map((x) => +new Date(x));
      return a.every((v, i) => i === 0 || v >= a[i - 1]);
    })],
  ['VAL_CURRENT', 'Valuation note dated within 90 days',
    (c) => c.units.every((u) => u.exited || daysTo(u.val.notedOn) >= -VAL_STALE_DAYS)],
  ['CONSENT', 'DPDP consent on record', (c) => !!c.consent.date],
  ['ADDRESS', 'Address updated since booking', (c) => c.captured.addr],
  ['STATUS', 'Owner status confirmed', (c) => !!c.status],
];

export function exceptions(base) {
  const out = [];
  base.forEach((c) => {
    const fails = CHECKS.filter(([, , t]) => !t(c));
    if (fails.length) out.push({ c, fails });
  });
  return out.sort((a, b) => b.fails.length - a.fails.length);
}

export const FILES = [
  ['units_master.csv', 'One row per unit. Comes from your inventory and legal files.',
    ['entity', 'project', 'tower', 'unit_no', 'type', 'carpet_sqft', 'saleable_sqft', 'booking_date', 'agreement_date', 'registry_date', 'possession_date', 'booking_rate_psf', 'discount', 'total_consideration', 'customer_pan']],
  ['payment_ledger.csv', 'One row per receipt. Comes from Tally. paid_to_date is derived from this and never keyed in.',
    ['unit_no', 'receipt_date', 'amount', 'mode', 'instrument_no', 'bounced_flag', 'demand_ref']],
  ['customer_master.csv', 'One row per person. Comes from your booking forms and KYC file.',
    ['pan', 'mobile', 'alt_mobile', 'email', 'salutation', 'full_name', 'co_applicant_name', 'co_relation', 'corr_address', 'city', 'occupation', 'dob', 'anniversary', 'source_channel', 'referred_by_mobile', 'owner_status']],
];

export const FORM_FIELDS = [
  ['name', 'Full name', 'text'],
  ['pan', 'PAN', 'text'],
  ['mobile', 'Mobile', 'text'],
  ['project', 'Project', 'select'],
  ['unit', 'Unit number', 'text'],
  ['saleable', 'Saleable sq.ft.', 'number'],
  ['rate', 'Booking rate per sq.ft.', 'number'],
  ['discount', 'Discount', 'number'],
  ['consideration', 'Total consideration', 'number'],
  ['bookDate', 'Booking date', 'date'],
  ['paid', 'Received to date', 'number'],
];

/* The bulk-import sheet's full column set — everything about an owner
   that is genuinely "one value per person" (identity, KYC, consent,
   co-applicant, occupation, address) plus the fields needed to create
   their first unit. Deliberately NOT included: loan/valuation detail,
   complaints, referrals, events, calls, NPS — those are per-unit or
   repeating records (an owner can have several), so they don't fit a
   flat one-row-per-owner sheet and are entered later from Customer
   Master as they happen, not pre-populated in bulk. This list drives
   only the Excel template/import (see excel.js) — the quick single-
   owner form still uses the shorter FORM_FIELDS above unchanged. */
export const FULL_FORM_FIELDS = [
  ['name', 'Full name', 'text'],
  ['pan', 'PAN', 'text'],
  ['mobile', 'Mobile', 'text'],
  ['email', 'Email', 'text'],
  ['salutation', 'Salutation', 'text'],
  ['dob', 'Date of birth', 'date'],
  ['spouseDob', 'Anniversary', 'date'],
  ['coApplicant', 'Co-applicant name', 'text'],
  ['coRelation', 'Co-applicant relation', 'text'],
  ['coOnAgreement', 'Co-applicant on agreement (Yes/No)', 'text'],
  ['kycDate', 'KYC completed date', 'date'],
  ['corrAddr', 'Current address', 'text'],
  ['city', 'City', 'text'],
  ['occupation', 'Occupation', 'text'],
  ['community', 'Community', 'text'],
  ['source', 'Came to us via', 'text'],
  ['consentWhatsapp', 'WhatsApp consent (Yes/No)', 'text'],
  ['consentSms', 'SMS consent (Yes/No)', 'text'],
  ['consentEmail', 'Email consent (Yes/No)', 'text'],
  ['consentMarketing', 'Marketing consent (Yes/No)', 'text'],
  ['consentChildren', "Children's data consent (Yes/No)", 'text'],
  ['consentPurpose', 'Consent purpose', 'text'],
  ['project', 'Project', 'select'],
  ['unit', 'Unit number', 'text'],
  ['saleable', 'Saleable sq.ft.', 'number'],
  ['rate', 'Booking rate per sq.ft.', 'number'],
  ['discount', 'Discount', 'number'],
  ['consideration', 'Total consideration', 'number'],
  ['bookDate', 'Booking date', 'date'],
  ['paid', 'Received to date', 'number'],
];

export const SAMPLE_DRAFT = () => {
  const p = PROJECTS[0], sa = 1250, rt = 2000, dc = 0;
  return {
    name: 'Sample Owner', pan: 'ABCPD1234E', mobile: '+91 9425012345',
    project: p.name, unit: 'GC-C-305', saleable: sa, rate: rt, discount: dc,
    consideration: rt * sa - dc, bookDate: '2021-04-02', paid: rt * sa - dc,
  };
};

export function validateDraft(d, base = []) {
  const e = {};
  if (!d.name || d.name.trim().length < 3) e.name = 'Enter the full name as it appears on the agreement.';

  const pan = (d.pan || '').replace(/\s/g, '');
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan)) {
    e.pan = 'PAN must be 5 letters, 4 digits, 1 letter — it is the primary dedupe key.';
  } else if (base.some((c) => c.pan.toUpperCase() === pan.toUpperCase())) {
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

/* Client-side mirror of backend/src/lib/validateIncomplete.js's
   validateShellDraft — for the "import as incomplete records" bulk
   path (see Intake.jsx), where only name/mobile/project/unit are
   mandatory and PAN/financials are optional-but-validated-if-present.
   The server re-validates independently either way. */
export function validateShellDraft(d, base = []) {
  const e = {};
  if (!d.name || d.name.trim().length < 3) e.name = 'Enter the full name as it appears on the agreement.';
  if (!/^\+?[0-9\s]{10,14}$/.test(d.mobile || '')) e.mobile = 'Enter a 10-digit mobile.';
  if (!d.project || !projByName(d.project)) e.project = 'Choose the project so the valuation note can be attached.';
  if (!d.unit) e.unit = 'Unit number is required.';

  const pan = (d.pan || '').replace(/\s/g, '');
  if (pan) {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan)) {
      e.pan = 'PAN must be 5 letters, 4 digits, 1 letter, or leave it blank until known.';
    } else if (base.some((c) => c.pan && c.pan.toUpperCase() === pan.toUpperCase())) {
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

  return e;
}

/* buildCustomer() used to live here and write straight into the
   in-memory base. Creating an owner now goes through the real API
   (POST /api/customers, see AppContext.addCustomer) — the equivalent
   builder + authoritative validation live server-side in
   server/src/lib/validate.js. validateDraft() below stays client-side
   for instant form feedback; the server re-validates independently. */
