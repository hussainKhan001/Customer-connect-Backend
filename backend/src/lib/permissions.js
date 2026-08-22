/* Server-side port of the ROLES/PERMS/PERM_LABEL matrix from the
   frontend's src/lib/reference.js (same source the Access & Governance
   page renders) — this is what makes that page's documented model real
   instead of just descriptive text. */
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
  ['Owner status and transfer state', ['F', 'S', 'N', 'N', 'N', 'F', 'N', 'N', 'S']],
  ['Engagement data — NPS, referrals, events, visits', ['F', 'F', 'F', 'S', 'O', 'F', 'N', 'N', 'N']],
  ['User management — add/edit/deactivate accounts', ['F', 'N', 'N', 'N', 'N', 'N', 'N', 'N', 'N']],
];

export const PERM_LABEL = {
  F: { cls: 'yes', t: 'full' },
  S: { cls: 'part', t: 'own scope' },
  O: { cls: 'part', t: 'own customers' },
  N: { cls: 'no', t: 'none' },
};

/* the one row no per-user override is allowed to touch — every screen
   in this app (Scoring Engine, Command Centre, Access & Governance)
   states as an absolute rule that nobody, at any level, can override
   the contact gate. Letting a per-user exception reach this row would
   quietly make that promise false. */
export const NON_OVERRIDABLE = 'Override the contact gate';

/* true unless the role's cell for this capability is 'N'. `overrides`
   (a user's own permissionOverrides, see models/User.js) takes
   precedence over the role's cell when present for that exact label —
   except NON_OVERRIDABLE, which always falls through to the role
   matrix (permanently 'N' for every role). Does not distinguish S/O/F
   yet (own-scope/own-customers record-level filtering needs an
   ownership model this app doesn't have) — see the plan doc for what's
   intentionally deferred. */
export function hasPermission(role, capabilityLabel, overrides) {
  if (overrides && capabilityLabel !== NON_OVERRIDABLE && overrides[capabilityLabel]) {
    return overrides[capabilityLabel] !== 'N';
  }
  const row = PERMS.find(([label]) => label === capabilityLabel);
  if (!row) return false;
  const idx = ROLES.indexOf(role);
  if (idx === -1) return false;
  return row[1][idx] !== 'N';
}
