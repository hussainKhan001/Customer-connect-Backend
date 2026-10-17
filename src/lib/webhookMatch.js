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

  /* strips everything but letters/digits before comparing — "RG-1106"
     (ours, project-code prefixed) vs "1106" (theirs, bare) are the
     same unit with different house style, not two different units;
     an exact-string check treated that formatting gap as a non-match
     and fell through to "ambiguous, give up" the moment two owners
     happened to share a contact number (a real case: two different
     customers on the very same mobile). */
  const stripUnit = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const unitNorm = stripUnit(unit);
  const projectNorm = projectName ? String(projectName).trim().toLowerCase() : null;

  for (const customer of candidates) {
    const found = customer.units.find((u) => {
      const uNorm = stripUnit(u.unit);
      if (!uNorm || !unitNorm || !(uNorm.includes(unitNorm) || unitNorm.includes(uNorm))) return false;
      if (!projectNorm) return true;
      const p = String(u.project || '').trim().toLowerCase();
      /* substring either direction — "Garden City" (ours) vs "Garden
         City Phase 2" (theirs) or vice versa, since the two systems
         were never guaranteed to spell project names identically */
      return p.includes(projectNorm) || projectNorm.includes(p);
    });
    if (found) return { customer, unit: found };
  }

  /* the unit/project text didn't line up with anything on file (a
     typo, "Flat no.418" vs our "418", a renamed block) — but the
     contact number is still this owner's and nobody else's, which is
     exactly the signal staff asked to trust: a complaint is "theirs"
     by phone number, the unit description is just detail that failed
     to parse, not reason to leave it in the unmatched queue. */
  return candidates.length === 1 ? { customer: candidates[0], unit: null } : null;
}
