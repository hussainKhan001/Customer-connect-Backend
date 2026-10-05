import SystemError from '../models/SystemError.js';

/* Fire-and-forget, same reasoning as lib/auditLog.js's recordAudit — a
   failing write to the error log must never compound the outage it's
   trying to record. */
function recordSystemError(entry) {
  SystemError.create(entry).catch((e) => console.error('System error log write failed:', e.message));
}

function fieldErrorsFromValidation(err) {
  const out = {};
  for (const [field, e] of Object.entries(err.errors || {})) {
    out[field] = e.message;
  }
  return out;
}

/* Every response this produces carries `correlationId` alongside the
   existing `error`/`errors` shape every route already returns on
   failure — additive, not a new envelope, so no existing frontend
   catch block (which reads .error / .errors) has to change for this to
   take effect. Only genuinely-unexpected (uncategorized) errors get
   persisted to SystemError — a bad request the code already understood
   (validation, a duplicate key, a bad id) isn't "the system is
   broken", so it doesn't belong in that trail. */
export function errorHandler(err, req, res, _next) { // eslint-disable-line no-unused-vars
  const correlationId = req.correlationId || null;
  const actor = req.user
    ? { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role }
    : null;

  console.error(`[${correlationId || 'no-correlation-id'}]`, err);

  const respond = (status, body) => res.status(status).json({ correlationId, ...body });

  /* multer (file upload) rejections are user-facing validation errors,
     not server faults */
  if (err.code === 'LIMIT_FILE_SIZE') return respond(400, { errors: { file: 'File is too large — max 10MB.' } });
  if (err.message === 'UNSUPPORTED_FILE_TYPE') return respond(400, { errors: { file: 'Only PDF, JPG or PNG files are allowed.' } });

  /* Mongoose's own validation — a route that skipped its validate*.js
     check, or a constraint only the schema itself enforces */
  if (err.name === 'ValidationError') return respond(400, { errors: fieldErrorsFromValidation(err) });

  /* a malformed ObjectId (or similar) reaching a query — always a bad
     reference in the request, never a server fault */
  if (err.name === 'CastError') return respond(400, { error: 'That record could not be found — its reference looks invalid.' });

  /* a unique-index violation Mongoose surfaces raw */
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    return respond(400, { errors: { [field]: `This ${field} is already in use.` } });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return respond(401, { error: 'Session expired — please sign in again.' });
  }

  /* the catch-all for anything unexpected (a bug, a bad DB value) — the
     real detail goes to the server log and the system-error trail
     above, never to the client: a raw Mongoose/JS error message ("Cast
     to Number failed for value ...") means nothing to someone using the
     app and just reads as broken software. What they get instead is
     plain and actionable, with the correlation id to hand to support. */
  recordSystemError({
    correlationId,
    message: err.message,
    stack: err.stack,
    statusCode: 500,
    method: req.method,
    path: req.originalUrl?.split('?')[0],
    actor,
    ip: req.ip,
  });
  respond(500, { error: 'Something went wrong on our end. Please try again — if it keeps happening, contact your admin with this reference: ' + (correlationId || 'unknown') });
}

/* Same persistence path for the two failure modes Express's own error
   middleware never sees at all — a rejected promise nobody awaited, or
   a genuinely uncaught throw. Returns the write's own promise (unlike
   the fire-and-forget request path above) so a caller that's about to
   process.exit() on an uncaughtException can await it first — losing
   the one log entry that explains the crash defeats the point. */
export function recordFatalError(kind, err) {
  console.error(`Unhandled ${kind}:`, err);
  return SystemError.create({
    message: err?.message || String(err),
    stack: err?.stack || null,
    statusCode: 500,
    method: null,
    path: `process:${kind}`,
    actor: null,
    ip: null,
  }).catch((e) => console.error('System error log write failed:', e.message));
}
