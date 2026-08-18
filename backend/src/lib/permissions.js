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
];

export const PERM_LABEL = {
  F: { cls: 'yes', t: 'full' },
  S: { cls: 'part', t: 'own scope' },
  O: { cls: 'part', t: 'own customers' },
  N: { cls: 'no', t: 'none' },
};

/* true unless the role's cell for this capability is 'N'. Does not
   distinguish S/O/F yet (own-scope/own-customers record-level
   filtering needs an ownership model this app doesn't have) — see the
   plan doc for what's intentionally deferred. */
export function hasPermission(role, capabilityLabel) {
  const row = PERMS.find(([label]) => label === capabilityLabel);
  if (!row) return false;
  const idx = ROLES.indexOf(role);
  if (idx === -1) return false;
  return row[1][idx] !== 'N';
}
