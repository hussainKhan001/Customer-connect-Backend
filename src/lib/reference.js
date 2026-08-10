/* =====================================================================
   REFERENCE — the field dictionary and the access matrix. Static tables
   that document the system rather than drive it.
   ===================================================================== */

/* [db field, on screen, type, source, capture owner, required, pii, note] */
export const DICT = [
  ['Layer 1 — Identity and relationship graph', [
    ['customer_id', 'Customer ID', 'string', 'Assigned on first booking', 'System', 'Yes', '', 'Spans all three entities. A buyer in Neoteric Properties and Navayan is ONE record. This is Phase 0.'],
    ['owner_status', 'Owner status', 'enum', 'Legal / registry search', 'CRM', 'Yes', '', 'Active · Exited · Transfer in progress · Deceased. The most important field in the system — it decides whether this person may be contacted at all.'],
    ['owner_status_since, status_note', 'Status changed', 'date + text', 'Legal', 'CRM', 'Yes', '', ''],
    ['salutation, full_name, gender', 'Name', 'string', 'Booking form', 'CRM', 'Yes', 'PII', ''],
    ['pan', 'PAN', 'string, masked', 'KYC', 'CRM', 'Yes', 'PII', 'Primary dedupe key. Never dedupe on name.'],
    ['aadhaar_held', 'Aadhaar on file', 'boolean', 'KYC', 'CRM', 'Yes', 'PII', 'Store the flag, not the number, unless you have a lawful basis to retain it.'],
    ['mobile, alt_mobile', 'Mobile', 'string', 'Booking form', 'CRM', 'Yes', 'PII', 'Secondary dedupe key.'],
    ['corr_address, perm_address', 'Address', 'text', 'Booking form', 'CRM', 'Yes', 'PII', 'Flag when not updated since booking — statements get returned.'],
    ['dob', 'Date of birth', 'date', 'Owner profile', 'Customer', 'No', 'PII', 'Missing on roughly 6 in 10 records today.'],
    ['co_applicant_name, relation, on_agreement', 'Co-applicant', 'string', 'Sale agreement', 'CRM', 'Yes', 'PII', 'Decides who the statement is addressed to and who signs an exchange.'],
    ['spouse_dob', 'Anniversary', 'date', 'Owner profile', 'Customer', 'No', 'PII', ''],
    ['children[] {name, dob}', 'Children', 'array', 'Owner profile', 'Customer', 'No', 'PII', 'DPDP requires verifiable parental consent. Consider dropping this field entirely.'],
    ['occupation, employer, income_band', 'Occupation', 'enum', 'Owner profile', 'Customer', 'No', '', 'Feeds Capacity. Salaried and business have different liquidity patterns.'],
    ['community_cluster, home_town', 'Community', 'enum', 'Owner profile', 'Customer', 'No', 'PII', 'For network mapping only — never for pricing or selection.'],
    ['source_channel', 'Came to us via', 'enum', 'Booking form', 'Sales', 'Yes', '', ''],
    ['referred_by_customer_id', 'Referred by', 'FK', 'Booking form', 'Sales', 'No', '', 'Tag at booking or it is lost forever.'],
  ]],
  ['Layer 2 — Investment ledger (one row per unit)', [
    ['unit_id, project, entity, tower, unit_no', 'Unit', 'string', 'Inventory master', 'Sales', 'Yes', '', ''],
    ['carpet_sqft, saleable_sqft, loading_pct', 'Area', 'number', 'Inventory master', 'Projects', 'Yes', '', 'Carry both. Loading is what buyers now ask about; RERA is written around carpet.'],
    ['booking_date, agreement_date, registry_date, possession_date', 'Milestones', 'date', 'Legal file', 'CRM', 'Yes', '', 'Four dates. Each is a trigger and each is a gate.'],
    ['booking_rate_psf, discount, realised_rate_psf', 'Rate paid', 'number', 'Booking form', 'Sales', 'Yes', '', 'rate × saleable − discount must equal consideration or the row is rejected at import.'],
    ['total_consideration', 'Consideration', 'number', 'Sale agreement', 'Finance', 'Yes', '', ''],
    ['receipts[] {date, amount, mode, instrument, bounced}', 'Payment ledger', 'array', 'Tally', 'Finance', 'Yes', '', 'paid_to_date is DERIVED from this. Never keyed in.'],
    ['paid_to_date, outstanding', 'Paid / outstanding', 'derived', '—', 'System', '—', '', 'Any mismatch against Tally holds the record in the exceptions queue.'],
    ['funding_mode, bank, tenure, emi_start, loan_closure_date, closed_on, prepaid', 'Loan', 'object', 'Bank NOC / customer', 'CRM', 'No', '', 'Closure date is a top-three trigger — that EMI becomes free capacity.'],
    ['val {ask_psf, resale_psf, circle_psf, noted_on, basis, signed_by}', 'Valuation', 'object', 'Monthly valuation note', 'Finance', 'Yes', '', 'Value at resale, floor at circle, never publish the ask. noted_on and basis are what make it defensible.'],
    ['exited, exit_date, exit_rate', 'Exit', 'object', 'Registry search', 'Legal', 'No', '', 'A resale you did not handle. Record it — it is the running cost of no exit desk.'],
    ['derived: current_value, gain_inr, gain_pct, cagr, holding_years, ltcg_date', 'Position', 'derived', '—', 'System', '—', '', ''],
  ]],
  ['Layer 3 — Behaviour, trust and consent', [
    ['complaints[] {text, raised, closed, days, ncr_ref, owner}', 'Complaints', 'array', 'CRM / NCR system', 'CRM', 'Yes', '', 'Any open complaint closes the gate. Links to your existing NCR numbering.'],
    ['nps_score, nps_captured_on', 'NPS', 'number + date', 'Survey', 'CRM', 'No', '', 'A score older than 12 months should not be scored on.'],
    ['litigation_flag', 'Litigation', 'boolean', 'Legal case system', 'Legal', 'Yes', '', 'Hard block.'],
    ['payment_discipline, cheque_returns', 'Payment discipline', 'derived', 'Ledger', 'System', '—', '', ''],
    ['site_visits_post_booking, events_attended[]', 'Engagement', 'array', 'Event register', 'CRM', 'No', '', ''],
    ['referrals[] {name, id, date, status, rm_assigned}', 'Referrals given', 'array', 'CRM', 'Sales', 'No', '', 'Track the ones that did NOT convert. Silence towards the referrer kills the second referral.'],
    ['consent {whatsapp, sms, email, marketing, date, purpose, withdrawal}', 'Consent', 'object', 'Consent capture', 'CRM', 'Yes', 'PII', 'Marketing consent is separate from service consent. No marketing consent = no statement, whatever the score.'],
    ['consent.children, parental_consent_ref', 'Children data consent', 'object', 'Consent capture', 'CRM', 'Cond.', 'PII', 'Required if any child DOB is held.'],
  ]],
  ['Layer 4 — Trigger dates', [
    ['dob, spouse_dob, children_dob[]', 'Personal dates', 'date', 'Owner profile', 'Customer', 'No', 'PII', 'Recurring. Only fire when the gate is open.'],
    ['booking / registry / possession anniversary', 'Portfolio dates', 'derived', '—', 'System', '—', '', 'Derivable from what you already hold. Start the trigger calendar here.'],
    ['ltcg_eligible_date', 'LTCG / 54F window', 'derived', 'booking + 24 months', 'System', '—', '', 'Constrains when an exchange can happen without a tax hit, not just when to call.'],
    ['loan_closure_date', 'Loan closure', 'date', 'Bank / customer', 'CRM', 'No', '', ''],
    ['festive_calendar', 'Auspicious window', 'system table', 'Maintained annually', 'Marketing', '—', '', 'Akshaya Tritiya, Navratri, Dhanteras, Gudi Padwa.'],
  ]],
  ['Layer 5 — Derived state and governance', [
    ['capacity, trust, timing, engagement', 'Pillar scores', 'derived', '—', 'System', '—', '', ''],
    ['propensity_score, segment, segment_since', 'Segment', 'derived', '—', 'System', '—', '', 'Segment C is set by the gate, never by the score.'],
    ['gate_status, gate_code, gate_reason', 'Contact gate', 'derived', '—', 'System', '—', '', 'Machine-readable so the send layer enforces it independently of the screen.'],
    ['data_confidence_pct, failed_checks[]', 'Data confidence', 'derived', '—', 'System', '—', '', 'Which records are clean enough to put in front of a customer.'],
    ['statements[] {sent_on, version, channel, opened, disputed}', 'Statement history', 'array', 'Send layer', 'System', '—', '', 'Archive exactly what the customer saw, not what the database says today.'],
    ['activity[] {date, type, text, by}', 'Activity log', 'array', 'All systems', 'System', 'Yes', '', 'Without outcome data the weights can never be re-fit.'],
    ['next_action, next_action_owner, next_action_due', 'Next action', 'object', 'Manual', 'Named person', 'Yes', '', 'A named owner and a date, or it does not happen.'],
  ]],
];

export const ROLES = ['Board / CEO', 'GM Sales', 'AGM', 'Coordinator', 'RM', 'CRM', 'Service', 'Finance', 'Legal'];
export const PERMS = [
  ['Owner base — names and units', ['F', 'F', 'F', 'F', 'O', 'F', 'F', 'F', 'F']],
  ['Payment ledger and outstanding', ['F', 'F', 'S', 'N', 'N', 'S', 'N', 'F', 'S']],
  ['Unrealised gain and valuation', ['F', 'F', 'S', 'N', 'N', 'S', 'N', 'F', 'N']],
  ['Propensity score and segment', ['F', 'F', 'F', 'S', 'O', 'F', 'N', 'N', 'N']],
  ['Personal dates — DOB, anniversary', ['S', 'S', 'S', 'S', 'O', 'F', 'N', 'N', 'N']],
  ['Complaints and NCR references', ['F', 'S', 'F', 'S', 'O', 'F', 'F', 'N', 'F']],
  ['Litigation flag and case notes', ['F', 'S', 'N', 'N', 'N', 'S', 'N', 'S', 'F']],
  ['Consent record', ['F', 'S', 'S', 'S', 'N', 'F', 'S', 'N', 'F']],
  ['Send a portfolio statement', ['F', 'F', 'S', 'N', 'N', 'F', 'N', 'N', 'N']],
  ['Export the base', ['F', 'S', 'N', 'N', 'N', 'N', 'N', 'S', 'N']],
  ['Change the valuation note', ['S', 'N', 'N', 'N', 'N', 'N', 'N', 'F', 'N']],
  ['Override the contact gate', ['N', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N']],
];
export const PERM_LABEL = {
  F: { cls: 'yes', t: 'full' },
  S: { cls: 'part', t: 'own scope' },
  O: { cls: 'part', t: 'own customers' },
  N: { cls: 'no', t: 'none' },
};
