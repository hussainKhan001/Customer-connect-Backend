import { Router } from 'express';
import SystemError from '../models/SystemError.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const router = Router();
const PAGE_SIZE = 50;

/* Read-only — writes to this collection only ever happen from
   lib/errorHandler.js, never from a client request. Gated on
   MANAGE_USERS in index.js, same audience as the audit log. */
router.get('/', asyncHandler(async (req, res) => {
  const { resolved, from, to, page } = req.query;

  const filter = {};
  if (resolved === 'true') filter.resolved = true;
  if (resolved === 'false') filter.resolved = false;
  if (from || to) {
    filter.at = {};
    if (from) filter.at.$gte = new Date(from);
    if (to) filter.at.$lte = new Date(to);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  const [docs, total, unresolvedTotal] = await Promise.all([
    SystemError.find(filter).sort({ at: -1 }).skip((pageNum - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    SystemError.countDocuments(filter),
    SystemError.countDocuments({ resolved: false }),
  ]);

  res.json({
    entries: docs.map((d) => d.toJSON()),
    total,
    unresolvedTotal,
    page: pageNum,
    pageSize: PAGE_SIZE,
  });
}));

/* the only write this collection ever accepts from a client — marking
   something as looked-at. Nothing else about a system error is
   editable; it's a record of what happened, not a form. */
router.patch('/:id', asyncHandler(async (req, res) => {
  const entry = await SystemError.findById(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  if (req.body?.resolved !== undefined) entry.resolved = !!req.body.resolved;
  await entry.save();
  res.json(entry.toJSON());
}));

export default router;
