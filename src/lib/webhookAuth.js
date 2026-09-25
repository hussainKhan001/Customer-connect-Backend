/* Shared-secret auth for server-to-server webhook callers (the PHP
   scripts pushing complaints/referrals/leads) — they have no browser
   and no user account, so the httpOnly-cookie session every other
   route uses (lib/auth.js's requireAuth) doesn't apply. One key for
   now: a handful of trusted internal integrations calling in, not a
   public API that needs per-partner issuance/revocation. */
export function requireWebhookKey(req, res, next) {
  const expected = process.env.WEBHOOK_API_KEY;
  if (!expected) {
    console.error('WEBHOOK_API_KEY is not set — refusing all webhook calls.');
    return res.status(503).json({ error: 'Webhook endpoint not configured.' });
  }
  const key = req.headers['x-api-key'];
  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Invalid or missing API key.' });
  }
  next();
}
