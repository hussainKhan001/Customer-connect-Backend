import { Router } from 'express';
import Lead from '../models/Lead.js';
import ExternalComplaint from '../models/ExternalComplaint.js';
import Customer from '../models/Customer.js';
import { requirePermission } from '../lib/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

const canManage = requirePermission('Manage leads and external complaints');

/* Readable by anyone signed in with the Module row (route-level gate,
   see index.js) — writes below carry their own explicit check since
   the module row only ever controls page visibility, same pattern as
   every other module in this app. */
router.get('/', asyncHandler(async (_req, res) => {
  const leads = await Lead.find().sort({ createdAt: -1 });
  res.json(leads);
}));

router.get('/complaints', asyncHandler(async (_req, res) => {
  const complaints = await ExternalComplaint.find().sort({ createdAt: -1 });
  res.json(complaints);
}));

router.patch('/:id', canManage, asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const body = req.body || {};
  if (body.status !== undefined) {
    if (!['New', 'Contacted', 'Converted', 'Lost'].includes(body.status)) {
      return res.status(400).json({ errors: { status: 'Choose a valid status.' } });
    }
    lead.status = body.status;
  }
  if (body.notes !== undefined) lead.notes = String(body.notes || '').trim() || null;

  await lead.save();
  res.json(lead);
}));

/* Marks a Lead as booked — records which real Customer it became
   rather than auto-creating one: a webhook payload has no PAN or unit
   financials, so minting a full owner record from it isn't safe. The
   actual booking is still entered the normal way (Intake), and staff
   link it back here once it exists. */
router.post('/:id/convert', canManage, asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const customerId = String(req.body?.customerId || '').trim();
  if (!customerId) return res.status(400).json({ errors: { customerId: 'Enter the Customer ID this lead became.' } });
  const customer = await Customer.findOne({ id: customerId });
  if (!customer) return res.status(400).json({ errors: { customerId: `No customer found with ID "${customerId}".` } });

  lead.status = 'Converted';
  lead.convertedCustomerId = customerId;
  await lead.save();
  res.json(lead);
}));

/* Manual review queue for complaints the webhook couldn't confidently
   match to an owner (see lib/webhookMatch.js) — links it after the
   fact once staff have identified who it's actually about. */
router.patch('/complaints/:id', canManage, asyncHandler(async (req, res) => {
  const complaint = await ExternalComplaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

  const body = req.body || {};
  if (body.customerId !== undefined) {
    const customerId = String(body.customerId || '').trim();
    if (customerId) {
      const customer = await Customer.findOne({ id: customerId });
      if (!customer) return res.status(400).json({ errors: { customerId: `No customer found with ID "${customerId}".` } });
      complaint.customerId = customerId;
      complaint.matched = true;
    } else {
      complaint.customerId = null;
      complaint.matched = false;
    }
  }
  if (body.status !== undefined) complaint.status = String(body.status || '').trim() || 'Pending';
  if (body.adminComments !== undefined) complaint.adminComments = String(body.adminComments || '').trim() || null;

  await complaint.save();
  res.json(complaint);
}));

export default router;
