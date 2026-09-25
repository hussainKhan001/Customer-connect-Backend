import { Router } from 'express';
import Lead from '../models/Lead.js';
import ExternalComplaint from '../models/ExternalComplaint.js';
import { matchOwnerByContact } from '../lib/webhookMatch.js';
import {
  validateComplaintWebhook, validateReferralWebhook, validateLeadWebhook, validateStatusWebhook,
} from '../lib/validateWebhooks.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

/* ---- complaints ---- */

router.post('/complaints', asyncHandler(async (req, res) => {
  const { errors, data } = validateComplaintWebhook(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const match = await matchOwnerByContact(data.contactNo, data.projectName, data.unit);

  const complaint = await ExternalComplaint.create({
    ...data,
    customerId: match?.customer.id ?? null,
    matched: !!match,
  });
  res.status(201).json(complaint);
}));

router.patch('/complaints/:id/status', asyncHandler(async (req, res) => {
  const { errors, data } = validateStatusWebhook(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const complaint = await ExternalComplaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  complaint.status = data.status;
  if (data.adminComments !== undefined) complaint.adminComments = data.adminComments;
  await complaint.save();
  res.json(complaint);
}));

/* ---- referrals ---- */

/* an app-referral always produces a Lead for the buyer — the referral
   note on the referring owner's own Customer record (if matched) is
   secondary bookkeeping, see routes/customers.js's existing POST
   /:id/referrals for that older, staff-entered path this doesn't
   replace. */
router.post('/referrals', asyncHandler(async (req, res) => {
  const { errors, data } = validateReferralWebhook(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const match = await matchOwnerByContact(data.ownerContact, null, data.unit);
  if (match) {
    match.customer.referrals.push({ n: data.buyerName, status: 'Open — no follow-up logged', date: new Date() });
    await match.customer.save();
  }

  const lead = await Lead.create({
    name: data.buyerName,
    mobile: data.buyerContact,
    email: data.email,
    source: 'Referral',
    referredBy: {
      customerId: match?.customer.id ?? null,
      name: data.ownerName,
      ownProperty: data.ownProperty,
      unit: data.unit,
      contactNo: data.ownerContact,
    },
    raw: req.body,
  });
  res.status(201).json(lead);
}));

/* ---- website leads ---- */

router.post('/leads', asyncHandler(async (req, res) => {
  const { errors, data } = validateLeadWebhook(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const lead = await Lead.create({
    name: data.name,
    mobile: data.mobile,
    propertyType: data.propertyType,
    source: 'Website',
    sourceDetail: data.sourceDetail,
    raw: req.body,
  });
  res.status(201).json(lead);
}));

router.patch('/leads/:id/status', asyncHandler(async (req, res) => {
  const status = String(req.body?.Status ?? req.body?.status ?? '').trim();
  if (!['New', 'Contacted', 'Converted', 'Lost'].includes(status)) {
    return res.status(400).json({ errors: { status: 'Status must be one of New, Contacted, Converted, Lost.' } });
  }
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  lead.status = status;
  await lead.save();
  res.json(lead);
}));

export default router;
