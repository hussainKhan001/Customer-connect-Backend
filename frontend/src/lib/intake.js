/* =====================================================================
   INTAKE — the write path. Import validation, the exceptions queue, and
   the live form. Reject rather than guess: a row that does not
   reconcile is held, never adjusted.
   ===================================================================== */
import { daysTo, PROJECTS, VAL_STALE_DAYS } from './core.js';

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

/* Validation on import is intentionally OFF (both the single-owner
   form and the bulk-sheet path below) — a row is never held for
   content reasons. The equivalent, permissive coercion (bad numbers
   and dates become null, an unmatched project falls back to the
   first known one) happens server-side in buildCustomer()/
   buildShellCustomer(), which is what actually decides what gets
   written; these two stay as no-ops so Intake.jsx's validate-then-
   submit shape doesn't need to change. */
export function validateDraft() {
  return {};
}

export function validateShellDraft() {
  return {};
}

/* buildCustomer() used to live here and write straight into the
   in-memory base. Creating an owner now goes through the real API
   (POST /api/customers, see AppContext.addCustomer) — the equivalent
   builder + authoritative validation live server-side in
   server/src/lib/validate.js. validateDraft() below stays client-side
   for instant form feedback; the server re-validates independently. */
