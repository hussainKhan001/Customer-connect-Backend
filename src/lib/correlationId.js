import { randomUUID } from 'crypto';

/* Every request gets one id, carried through the response header and
   into any error this request causes (see lib/errorHandler.js and
   lib/auditLog.js) — a support conversation ("it broke around 3pm")
   becomes "search system errors / audit log for this exact id" instead
   of guessing from a timestamp and a vague description. Reuses an
   inbound X-Correlation-Id/X-Request-Id if the caller already sent one
   (a frontend retry, a proxy, another service) rather than always
   minting a fresh one, so a chain of related calls shares one id. */
export function correlationId(req, res, next) {
  const id = req.headers['x-correlation-id'] || req.headers['x-request-id'] || randomUUID();
  req.correlationId = id;
  res.setHeader('X-Correlation-Id', id);
  next();
}
