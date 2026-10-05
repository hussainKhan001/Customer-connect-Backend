import rateLimit from 'express-rate-limit';

/* IP-based, complementing (not replacing) routes/auth.js's own
   email-keyed Redis rate-limit on login — that one stops someone
   guessing passwords against ONE account; this stops one IP hammering
   auth endpoints broadly (across many emails, or the signup/whatever-
   else lives under /api/auth). Both degrade independently: this works
   with no Redis dependency at all (in-memory store), the other works
   with no rate-limit at all if Redis isn't configured. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts from this network. Please wait a few minutes and try again.' },
});

/* generous, broad backstop for the rest of the API — this is not meant
   to be the primary defense against abuse of any one endpoint (several
   already have their own capability checks), just a ceiling against a
   single client hammering the API by mistake (a runaway retry loop, a
   misbehaving integration) or on purpose. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

/* file uploads are the most expensive request this API serves (disk/
   network + a Cloudinary round-trip) — a tighter ceiling than the
   general API limit, separate from it so heavy-but-legitimate upload
   activity doesn't eat into the budget for everything else a user does
   in the same window. */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads from this network. Please wait a few minutes and try again.' },
});
