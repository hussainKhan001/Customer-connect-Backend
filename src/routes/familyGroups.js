import { Router } from 'express';
import FamilyGroup from '../models/FamilyGroup.js';
import Customer from '../models/Customer.js';
import { requirePermission } from '../lib/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();

const canManage = requirePermission('Manage family groups');

/* Readable by anyone signed in — same reasoning as /api/roles and
   /api/events: the "add to an existing group" picker needs the group
   list for any staff member, not just whoever can create/edit groups.
   Only the writes below are gated. */
router.get('/', asyncHandler(async (_req, res) => {
  const groups = await FamilyGroup.find().sort({ name: 1 });
  const counts = await Customer.aggregate([
    { $match: { familyGroupId: { $ne: null } } },
    { $group: { _id: '$familyGroupId', n: { $sum: 1 } } },
  ]);
  const countById = Object.fromEntries(counts.map((c) => [c._id, c.n]));
  res.json(groups.map((g) => ({ ...g.toJSON(), memberCount: countById[g.id] || 0 })));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const group = await FamilyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Family group not found' });
  res.json(group.toJSON());
}));

/* creates a group and links its first member in one call — the normal
   path from Customer Master's "Add to family group" action when the
   owner isn't part of any group yet and staff are naming a brand new
   one (as opposed to adding them to an existing group, see POST
   /:id/members below). */
router.post('/', canManage, asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const customerId = String(req.body?.customerId || '').trim();
  if (!name) return res.status(400).json({ errors: { name: 'Enter a name for this family group.' } });
  if (!customerId) return res.status(400).json({ errors: { customerId: 'Missing owner to add — reload and try again.' } });

  const customer = await Customer.findOne({ id: customerId });
  if (!customer) return res.status(400).json({ errors: { customerId: `No owner found with ID "${customerId}".` } });
  if (customer.familyGroupId) return res.status(400).json({ error: 'This owner is already part of a family group — remove them from it first.' });

  const group = await FamilyGroup.create({ name, createdBy: req.user.name });
  customer.familyGroupId = group.id;
  await customer.save();
  res.status(201).json(group.toJSON());
}));

router.patch('/:id', canManage, asyncHandler(async (req, res) => {
  const group = await FamilyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Family group not found' });

  if (req.body?.name !== undefined) {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ errors: { name: 'Name cannot be empty.' } });
    group.name = name;
  }
  if (req.body?.notes !== undefined) group.notes = String(req.body.notes || '').trim() || null;

  await group.save();
  res.json(group.toJSON());
}));

/* deletes the group and unlinks every member — the members themselves
   (their units, their own records) are completely untouched; this only
   removes the "these owners are one family" bookkeeping. */
router.delete('/:id', canManage, asyncHandler(async (req, res) => {
  const group = await FamilyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Family group not found' });

  await Customer.updateMany({ familyGroupId: group.id }, { familyGroupId: null });
  await group.deleteOne();
  res.json({ id: req.params.id });
}));

/* adds an existing owner to an already-existing group — the other half
   of "Add to family group": when the owner should join a group that
   already has other members, not start a new one. */
router.post('/:id/members', canManage, asyncHandler(async (req, res) => {
  const group = await FamilyGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Family group not found' });

  const customerId = String(req.body?.customerId || '').trim();
  if (!customerId) return res.status(400).json({ errors: { customerId: 'Missing owner to add.' } });

  const customer = await Customer.findOne({ id: customerId });
  if (!customer) return res.status(400).json({ errors: { customerId: `No owner found with ID "${customerId}".` } });
  if (customer.familyGroupId === group.id) return res.json(group.toJSON());
  if (customer.familyGroupId) return res.status(400).json({ error: 'This owner is already part of a different family group — remove them from it first.' });

  customer.familyGroupId = group.id;
  await customer.save();
  res.json(group.toJSON());
}));

/* returns the updated Customer (not just {ok:true}) — the frontend
   patches it straight into useApp()'s local state via patchCustomer,
   same as any other customer-scoped mutation, so the member disappears
   from the group card immediately rather than waiting on a Change
   Stream event (which doesn't fire at all outside a replica set, e.g.
   plain local MongoDB). */
router.delete('/:id/members/:customerId', canManage, asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.customerId, familyGroupId: req.params.id });
  if (!customer) return res.status(404).json({ error: 'This owner is not in that family group.' });
  customer.familyGroupId = null;
  await customer.save();
  res.json(customer);
}));

export default router;
