import { Router } from 'express';
import multer from 'multer';
import Customer from '../models/Customer.js';
import Counter, { nextCustomerId } from '../models/Counter.js';
import { isCloudinaryConfigured, uploadBuffer, deleteAsset } from '../lib/cloudinary.js';
import { validateDraft, buildCustomer, validateProfilePatch } from '../lib/validate.js';
import { validateShellDraft, buildShellCustomer, validateCompletion } from '../lib/validateIncomplete.js';
import {
  validateStatusPatch, validateLitigationPatch, validateComplaintOpen, validateComplaintClose,
  validateLoanPatch, validateValuationPatch, validateNpsPatch, validateReferralPatch,
  validateEventPatch, validateExitPatch, validateMilestonesPatch, validateCallPatch, matchUnit, matchComplaint,
} from '../lib/validateOps.js';
import { gate } from '../lib/gate.js';
import { TODAY } from '../lib/core.js';
import { requirePermission } from '../lib/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype);
    cb(ok ? null : new Error('UNSUPPORTED_FILE_TYPE'), ok);
  },
});

router.get('/', asyncHandler(async (_req, res) => {
  const customers = await Customer.find().sort({ id: 1 });
  res.json(customers);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
}));

router.post('/', asyncHandler(async (req, res) => {
  const draft = req.body || {};
  /* .filter(Boolean) matters now that a "shell" record (see
     validateIncomplete.js) can have pan: null — every PAN dedupe check
     calls .toUpperCase() on each entry, which throws on null */
  const existing = await Customer.find({}, 'pan');
  const errors = validateDraft(draft, existing.map((c) => c.pan).filter(Boolean));
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const id = await nextCustomerId();
  const raw = buildCustomer(draft, id);
  try {
    const created = await Customer.create(raw);
    res.status(201).json(created);
  } catch (err) {
    /* a duplicate PAN slipping past the pre-check above (a second
       request landed in the gap between the check and this insert) is
       the one failure mode worth a field-level error instead of a
       bare 500 — everything else falls through to the global handler */
    if (err.code === 11000) {
      return res.status(400).json({ errors: { pan: 'Duplicate PAN — this owner already exists.' } });
    }
    throw err;
  }
}));

/* creates a "shell" owner from a raw allotment/inventory list — only
   name/mobile/project/unit required, PAN and unit financials optional.
   Gated the same as the milestones route (general day-to-day CRM data
   entry) since, like that one, this doesn't map cleanly onto any
   single existing PERMS row. See validateIncomplete.js for why this is
   a genuinely separate path from the strict create route above rather
   than a relaxed mode of it. */
router.post('/incomplete', requirePermission('Owner base — names and units'), asyncHandler(async (req, res) => {
  const draft = req.body || {};
  const existing = await Customer.find({}, 'pan');
  const errors = validateShellDraft(draft, existing.map((c) => c.pan).filter(Boolean));
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const id = await nextCustomerId();
  const raw = buildShellCustomer(draft, id);
  try {
    const created = await Customer.create(raw);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ errors: { pan: 'Duplicate PAN — this owner already exists.' } });
    }
    throw err;
  }
}));

/* fills in the PAN + unit financials a shell record was missing —
   the moment it becomes a real, scoreable customer. Targets the first
   unit, since every shell record is created with exactly one. */
router.patch('/:id/complete', requirePermission('Owner base — names and units'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const others = await Customer.find({ id: { $ne: customer.id } }, 'pan');
  const { errors, patch } = validateCompletion(req.body || {}, others.map((c) => c.pan).filter(Boolean));
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  customer.pan = patch.pan;
  Object.assign(customer.units[0], patch.unit);
  customer.incomplete = false;
  customer.markModified('units');
  await customer.save();
  res.json(customer);
}));

/* "Complete profile" — fills in the fields the Data Confidence
   checklist flags as missing. Gated on one representative PERMS row
   rather than per-field (dob/anniversary, consent and identity fields
   sit under three different rows in the matrix; full per-row/per-field
   enforcement needs a customer-ownership model this app doesn't have
   yet — see the plan doc), matching the same single-permission-per-
   endpoint approach already used for the statements route below. */
router.patch('/:id', requirePermission('Personal dates — DOB, anniversary'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch } = validateProfilePatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const CAPTURE_FLAG = { dob: 'dob', spouseDob: 'anniv', corrAddr: 'addr', occupation: 'occ' };
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'consent') {
      Object.assign(customer.consent, value);
      continue;
    }
    customer[key] = value;
    if (CAPTURE_FLAG[key]) customer.captured[CAPTURE_FLAG[key]] = value != null;
  }
  if (patch.consent && !customer.consent.date) customer.consent.date = TODAY;

  await customer.save();
  res.json(customer);
}));

router.post('/:id/statements', requirePermission('Send a portfolio statement'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const g = gate(customer.toObject());
  if (!g.open) return res.status(409).json({ error: `Blocked by the gate: ${g.label}` });

  customer.statements.push({
    d: TODAY,
    v: req.body?.v || 'v1.0',
    ch: req.body?.ch || 'WhatsApp PDF',
    opened: false,
    profileDone: false,
    disputed: false,
    askedToSell: false,
    askedNewProject: false,
  });
  await customer.save();
  res.status(201).json(customer);
}));

/* =====================================================================
   BATCH 1 — owner status, litigation, complaints. status/litigation/
   openComplaints are the three gate-critical fields a human can now
   directly flip (see GATE_ORDER in derived.js / gate.js) — every write
   here changes whether this owner can be contacted at all, not just a
   score pillar.
   ===================================================================== */

router.patch('/:id/status', requirePermission('Owner status and transfer state'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch } = validateStatusPatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  customer.status = patch.status;
  customer.statusNote = patch.statusNote;
  customer.statusSince = TODAY;
  await customer.save();
  res.json(customer);
}));

router.patch('/:id/litigation', requirePermission('Litigation flag and case notes'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { patch } = validateLitigationPatch(req.body || {});
  customer.litigation = patch.litigation;
  await customer.save();
  res.json(customer);
}));

router.post('/:id/complaints', requirePermission('Complaints and NCR references'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch } = validateComplaintOpen(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  customer.openComplaints.push(patch);
  await customer.save();
  res.status(201).json(customer);
}));

router.post('/:id/complaints/:index/close', requirePermission('Complaints and NCR references'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch } = validateComplaintClose(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const idx = Number(req.params.index);
  const item = customer.openComplaints[idx];
  if (!matchComplaint(item, patch.ncr)) {
    return res.status(409).json({ error: 'This complaint list changed since you loaded it — refresh and try again.' });
  }

  customer.openComplaints.splice(idx, 1);
  customer.complaints.push({
    t: item.t,
    raised: item.raised,
    closed: TODAY,
    days: Math.max(0, Math.round((TODAY - item.raised) / 86400000)),
  });
  await customer.save();
  res.json(customer);
}));

/* =====================================================================
   BATCH 2 — per-unit loan and valuation note. Both addressed by array
   index with a natural-key ({unit, project}) safety check, since
   units[] has no stored per-item id (see plan doc) — a stale index
   409s instead of silently editing the wrong unit.
   ===================================================================== */

router.patch('/:id/units/:index/loan', requirePermission('Payment ledger and outstanding'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch, key } = validateLoanPatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const idx = Number(req.params.index);
  const unit = customer.units[idx];
  if (!matchUnit(unit, key)) {
    return res.status(409).json({ error: 'This unit list changed since you loaded it — refresh and try again.' });
  }

  Object.assign(unit.loan, patch);
  customer.markModified('units');
  await customer.save();
  res.json(customer);
}));

router.patch('/:id/units/:index/valuation', requirePermission('Change the valuation note'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch, key } = validateValuationPatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const idx = Number(req.params.index);
  const unit = customer.units[idx];
  if (!matchUnit(unit, key)) {
    return res.status(409).json({ error: 'This unit list changed since you loaded it — refresh and try again.' });
  }

  Object.assign(unit.val, patch);
  customer.markModified('units');
  await customer.save();
  res.json(customer);
}));

/* agreement/registry/possession dates — these are exactly what the
   Document Vault checklist reads (see docsFor() in derived.js), so
   editing them here is what actually makes "View"/"Request" reflect
   reality instead of always showing "not on file". */
router.patch('/:id/units/:index/milestones', requirePermission('Owner base — names and units'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch, key } = validateMilestonesPatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const idx = Number(req.params.index);
  const unit = customer.units[idx];
  if (!matchUnit(unit, key)) {
    return res.status(409).json({ error: 'This unit list changed since you loaded it — refresh and try again.' });
  }

  Object.assign(unit, patch);
  customer.markModified('units');
  await customer.save();
  res.json(customer);
}));

/* Document Vault upload — attaches a real file (Cloudinary-hosted) to
   one checklist row (see docsFor()'s `key` in derived.js). Re-uploading
   under the same key replaces the previous file rather than
   accumulating duplicates. */
router.post('/:id/documents', requirePermission('Owner base — names and units'), upload.single('file'), asyncHandler(async (req, res) => {
  if (!isCloudinaryConfigured()) {
    return res.status(500).json({ error: 'Document storage is not set up yet — add CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET to the backend .env.' });
  }
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  if (!req.file) return res.status(400).json({ errors: { file: 'Choose a PDF, JPG or PNG file.' } });

  const key = String(req.body?.key || '').trim();
  if (!key) return res.status(400).json({ errors: { file: 'Missing document reference — reload and try again.' } });

  const existing = customer.documents.find((x) => x.key === key);
  const folder = `neoteric-connect/${customer.id}`;
  const filename = `${key}-${Date.now()}`;
  const { url, publicId } = await uploadBuffer(req.file.buffer, { folder, filename });

  if (existing) {
    await deleteAsset(existing.publicId);
    Object.assign(existing, { filename: req.file.originalname, url, publicId, uploadedAt: TODAY });
  } else {
    customer.documents.push({ key, filename: req.file.originalname, url, publicId, uploadedAt: TODAY });
  }
  customer.markModified('documents');
  await customer.save();
  res.status(201).json(customer);
}));

/* =====================================================================
   BATCH 3 — NPS, referrals, events, site visits. All four are Score-
   only inputs (engagement/trust pillars) — none of them touch the
   Contact Gate.
   ===================================================================== */

router.patch('/:id/nps', requirePermission('Engagement data — NPS, referrals, events, visits'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch } = validateNpsPatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  customer.nps = patch.nps;
  customer.npsDate = patch.npsDate;
  await customer.save();
  res.json(customer);
}));

router.post('/:id/referrals', requirePermission('Engagement data — NPS, referrals, events, visits'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch } = validateReferralPatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  customer.referrals.push(patch);
  await customer.save();
  res.status(201).json(customer);
}));

router.post('/:id/events', requirePermission('Engagement data — NPS, referrals, events, visits'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch } = validateEventPatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  customer.events.push(patch);
  await customer.save();
  res.status(201).json(customer);
}));

router.post('/:id/site-visits', requirePermission('Engagement data — NPS, referrals, events, visits'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  /* +1 by default; -1 to undo a mis-click — never below 0 */
  const delta = req.body?.delta === -1 ? -1 : 1;
  customer.siteVisits = Math.max(0, (customer.siteVisits || 0) + delta);
  await customer.save();
  res.json(customer);
}));

/* the missing half of the Trigger Calendar loop — a reason to call
   someone is worthless if what happened on the call is never recorded
   anywhere (see Activity log's own footer note about re-fitting the
   score weights against real outcomes). */
router.post('/:id/calls', requirePermission('Engagement data — NPS, referrals, events, visits'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch } = validateCallPatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  customer.calls.push({ ...patch, by: req.user.name });
  await customer.save();
  res.status(201).json(customer);
}));

/* =====================================================================
   BATCH 4 — exit register. Marking a unit exited is customer-status-
   aware: a customer keeps status ACTIVE as long as at least one live
   unit remains, and only flips to EXITED once every unit they hold has
   exited (matches the seed generator's own invariant — see ExitRegister
   .jsx, which was fixed alongside this to stop assuming exactly one
   exited unit per EXITED customer).
   ===================================================================== */

router.patch('/:id/units/:index/exit', requirePermission('Owner status and transfer state'), asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const { errors, patch, key } = validateExitPatch(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const idx = Number(req.params.index);
  const unit = customer.units[idx];
  if (!matchUnit(unit, key)) {
    return res.status(409).json({ error: 'This unit list changed since you loaded it — refresh and try again.' });
  }

  unit.exited = true;
  unit.exitDate = patch.exitDate;
  unit.exitRate = patch.exitRate;
  customer.markModified('units');

  if (customer.units.every((u) => u.exited)) {
    customer.status = 'EXITED';
    customer.statusSince = TODAY;
    customer.statusNote = customer.statusNote || 'All units exited.';
  }

  await customer.save();
  res.json(customer);
}));

/* Wipes every customer record and resets the id counter back to 0 so
   the next import starts clean at NEO-C-1 — the same operation the
   one-off migration scripts (backend/clearAllCustomers.js) were doing
   by hand all session. Genuinely irreversible and affects every owner
   at once, so it's gated on the same permission as account management
   (Board/CEO only) and requires the exact confirmation phrase in the
   body as a server-side backstop behind the UI's own confirm dialog —
   a stray or scripted call with an empty body does nothing. */
router.delete('/', requirePermission('User management — add/edit/deactivate accounts'), asyncHandler(async (req, res) => {
  if (req.body?.confirm !== 'DELETE ALL CUSTOMERS') {
    return res.status(400).json({ error: 'Missing or incorrect confirmation phrase.' });
  }
  const { deletedCount } = await Customer.deleteMany({});
  await Counter.findOneAndUpdate({ name: 'customerSeq' }, { $set: { seq: 0 } }, { upsert: true });
  res.json({ deletedCount });
}));

export default router;
