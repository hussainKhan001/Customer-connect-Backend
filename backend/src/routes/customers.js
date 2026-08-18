import { Router } from 'express';
import Customer from '../models/Customer.js';
import { nextCustomerId } from '../models/Counter.js';
import { validateDraft, buildCustomer } from '../lib/validate.js';
import { gate } from '../lib/gate.js';
import { requirePermission } from '../lib/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  const customers = await Customer.find().sort({ id: 1 });
  res.json(customers);
});

router.get('/:id', async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

router.post('/', async (req, res) => {
  const draft = req.body || {};
  const existing = await Customer.find({}, 'pan');
  const errors = validateDraft(draft, existing.map((c) => c.pan));
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const id = await nextCustomerId();
  const raw = buildCustomer(draft, id);
  const created = await Customer.create(raw);
  res.status(201).json(created);
});

router.post('/:id/statements', requirePermission('Send a portfolio statement'), async (req, res) => {
  const customer = await Customer.findOne({ id: req.params.id });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const g = gate(customer.toObject());
  if (!g.open) return res.status(409).json({ error: `Blocked by the gate: ${g.label}` });

  customer.statements.push({
    d: new Date(),
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
});

export default router;
