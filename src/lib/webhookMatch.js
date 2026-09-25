import Customer from '../models/Customer.js';
import { normMobile } from './core.js';

/* Finds the existing owner (and specific unit) a webhook complaint or
   referral is about, from only what the external system sends — its
   own contact number plus a project/unit description, never our
   internal Customer id. Returns null on no-match or genuine ambiguity
   (two different owners with the same mobile somehow matching the
   same unit description) — the caller's job is to route that to a
   manual-review queue, never to guess. */
export async function matchOwnerByContact(contactNo, projectName, unit) {
  const mobile = normMobile(contactNo);
  if (!mobile) return null;

  const candidates = await Customer.find({ $or: [{ mobile }, { altMobile: mobile }] });
  if (!candidates.length) return null;

  /* no unit given to disambiguate — only safe to use if this contact
     number is unique to one owner in the first place */
  if (!unit) return candidates.length === 1 ? { customer: candidates[0], unit: null } : null;

  const unitNorm = String(unit).trim().toLowerCase();
  const projectNorm = projectName ? String(projectName).trim().toLowerCase() : null;

  for (const customer of candidates) {
    const found = customer.units.find((u) => {
      if (String(u.unit || '').trim().toLowerCase() !== unitNorm) return false;
      if (!projectNorm) return true;
      const p = String(u.project || '').trim().toLowerCase();
      /* substring either direction — "Garden City" (ours) vs "Garden
         City Phase 2" (theirs) or vice versa, since the two systems
         were never guaranteed to spell project names identically */
      return p.includes(projectNorm) || projectNorm.includes(p);
    });
    if (found) return { customer, unit: found };
  }
  return null;
}
