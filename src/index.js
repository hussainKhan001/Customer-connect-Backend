import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './db.js';
import authRouter from './routes/auth.js';
import customersRouter, { CUSTOMERS_LIST_CACHE_KEY } from './routes/customers.js';
import usersRouter from './routes/users.js';
import rolesRouter from './routes/roles.js';
import settingsRouter from './routes/settings.js';
import eventsRouter from './routes/events.js';
import auditLogsRouter from './routes/auditLogs.js';
import systemErrorsRouter from './routes/systemErrors.js';
import leadsRouter from './routes/leads.js';
import webhooksRouter from './routes/webhooks.js';
import familyGroupsRouter from './routes/familyGroups.js';
import Customer from './models/Customer.js';
import Settings from './models/Settings.js';
import { requireAuth, requirePermission } from './lib/auth.js';
import { auditRoute } from './lib/auditLog.js';
import { requireWebhookKey } from './lib/webhookAuth.js';
import { correlationId } from './lib/correlationId.js';
import { errorHandler, recordFatalError } from './lib/errorHandler.js';
import { seedRoles, ensureSuperAdminRole, backfillModuleCapabilities, refreshRoles } from './lib/roleStore.js';
import { refreshMasterData } from './lib/masterDataStore.js';
import { MANAGE_USERS } from './lib/permissions.js';
import { redisDel } from './lib/redis.js';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const app = express();
/* behind Render/Railway/any single reverse proxy in production — without
   this, req.ip (recorded on every audit log row) is the proxy's own
   address for every request, not the caller's. Gated on FRONTEND_ORIGIN
   rather than NODE_ENV — same reasoning as the auth cookie's flags in
   lib/auth.js: FRONTEND_ORIGIN is the one env var that's already
   verified correct (CORS depends on it), so nothing here can silently
   drift out of sync with a second, separately-set flag. */
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(FRONTEND_ORIGIN)) app.set('trust proxy', 1);
/* pure JSON API, no HTML/static assets served from here — the default
   CSP (meant for pages that load scripts/styles) is unused overhead
   for a fetch-only backend, so it's the one directive turned off */
app.use(helmet({ contentSecurityPolicy: false }));
/* credentials:true + a specific origin (not '*') is required for the
   httpOnly auth cookie to actually be sent/accepted cross-origin */
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());
/* before every route, including auth — anything that goes wrong from
   here on (a validation 400, an unexpected 500, an audit log row) can
   be tied back to this one request. See lib/correlationId.js. */
app.use(correlationId);

/* auditRoute(resource) is mounted on every router below (auth included)
   so every state-changing request the API ever serves — success or
   failure — is written to the AuditLog collection with no per-route
   instrumentation. See lib/auditLog.js. */
app.use('/api/auth', auditRoute('auth'), authRouter);
app.use('/api/customers', requireAuth, auditRoute('customers'), customersRouter);
app.use('/api/users', requireAuth, requirePermission(MANAGE_USERS), auditRoute('users'), usersRouter);
/* only requireAuth here — the role list itself is readable by anyone
   signed in (it drives the governance matrix and every role picker);
   each write route below carries its own permission check. */
app.use('/api/roles', requireAuth, auditRoute('roles'), rolesRouter);
/* same shape as /api/roles — readable by anyone signed in (the
   Portfolio Statement's letterhead needs it), writable only by
   requirePermission(MANAGE_USERS) inside the router itself. */
app.use('/api/settings', requireAuth, auditRoute('settings'), settingsRouter);
/* same shape again — readable by anyone signed in (the Invite list
   drawer needs the event picker for any staff member), writable only
   by requirePermission('Manage events and invite lists') inside the
   router itself. */
app.use('/api/events', requireAuth, auditRoute('events'), eventsRouter);
/* read-only viewer onto everything the line above wrote — same
   capability as /api/users, see routes/auditLogs.js. Not itself
   audited: GETs never are (auditRoute skips them), and this route in
   particular reading its own write log is not a fact worth a row. */
app.use('/api/audit-logs', requireAuth, requirePermission(MANAGE_USERS), auditLogsRouter);
/* same audience again — the "something actually broke" trail
   (lib/errorHandler.js), distinct from the audit log's "who did what"
   trail above. GETs aren't audited (see auditRoute's own comment), and
   its one write (marking an entry resolved) is a housekeeping action
   on this collection itself, not worth a row in the OTHER log. */
app.use('/api/system-errors', requireAuth, requirePermission(MANAGE_USERS), systemErrorsRouter);
/* same shape again — readable by anyone signed in with the Module row
   (the Leads page), writable only by requirePermission('Manage leads
   and external complaints') inside the router itself. */
app.use('/api/leads', requireAuth, auditRoute('leads'), leadsRouter);
/* same shape again — readable by anyone signed in (Customer Master
   needs the group list for the "add to existing group" picker),
   writable only by requirePermission('Manage family groups') inside
   the router itself. */
app.use('/api/family-groups', requireAuth, auditRoute('familyGroups'), familyGroupsRouter);
/* NOT requireAuth — these are called by external server-to-server
   systems (PHP scripts) with no browser session, authenticated by a
   shared API key instead (see lib/webhookAuth.js). Still audited, same
   as everything else that writes: auditRoute reads req.user when
   present and just records actor: null when it isn't, which is
   exactly the case here. */
app.use('/api/webhooks', requireWebhookKey, auditRoute('webhooks'), webhooksRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* default route for uptime pingers (UptimeRobot, cron-job.org, Render's
   own health check, etc.) that hit '/' rather than '/api/health' — keeps
   a free-tier instance from being treated as 404/down and spun back down */
app.get('/', (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

/* Express's error middleware only ever sees errors thrown inside a
   request cycle — a rejected promise nobody awaited, or a throw from a
   timer/callback outside any request, never reaches it at all and
   would otherwise just be a silent console.error with no record.
   Node still considers the process's state suspect after either, so
   this logs it (recordFatalError persists to SystemError) and exits
   rather than limping on — matching Node's own documented advice for
   uncaughtException, and applied the same way to unhandledRejection
   since a "silently ignore it" default has bitten teams before. */
process.on('unhandledRejection', (reason) => {
  recordFatalError('rejection', reason instanceof Error ? reason : new Error(String(reason)))
    .finally(() => process.exit(1));
});
process.on('uncaughtException', (err) => {
  recordFatalError('exception', err).finally(() => process.exit(1));
});

const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: FRONTEND_ORIGIN, credentials: true } });

connectDB()
  .then(async () => {
    /* roles must be in the permission cache before the first request is
       served — every requirePermission() check reads it, and an empty
       cache denies everything (see roleLevel in permissions.js) */
    const { seeded } = await seedRoles();
    if (seeded) console.log(`Seeded ${seeded} roles from the access matrix`);
    const { created, backfilled } = await ensureSuperAdminRole();
    if (created) console.log('Created the Super Admin role');
    else if (backfilled.length) console.log(`Backfilled Super Admin with ${backfilled.length} new capabilit${backfilled.length === 1 ? 'y' : 'ies'}: ${backfilled.join(', ')}`);
    const { touched } = await backfillModuleCapabilities();
    if (touched) console.log(`Backfilled module-visibility rows onto ${touched} role(s)`);
    await refreshRoles();

    /* same reasoning as roles above — projByName()/OCC/COMM/etc. in
       core.js must reflect the real Settings document (or its schema
       defaults, for a fresh database) before the first request, not
       whatever was hardcoded into core.js at the time it was written. */
    await refreshMasterData();

    /* MongoDB Change Streams require a replica set — Atlas clusters
       (and any local `rs.initiate()`'d instance) qualify. Any write to
       the customers collection — from this API, a seed run, or someone
       editing directly in Compass — pushes a live event to every
       connected browser tab. */
    const changeStream = Customer.watch();
    changeStream.on('change', (change) => {
      io.emit('customers:changed', { operationType: change.operationType });
      // fire-and-forget — a missed delete just means the 30s TTL in
      // routes/customers.js is the fallback instead of this being instant
      redisDel(CUSTOMERS_LIST_CACHE_KEY).catch(() => {});
    });
    changeStream.on('error', (err) => {
      console.error('Change stream error:', err.message);
    });

    /* same live-sync pattern as Customer above — the Portfolio
       Statement letterhead (and anywhere else Settings is read) is
       shared, mutable state with no per-user scope, so a change from
       one signed-in tab (or a direct DB edit) should reach every other
       open tab without a manual refresh. */
    const settingsChangeStream = Settings.watch();
    settingsChangeStream.on('change', () => {
      io.emit('settings:changed', {});
    });
    settingsChangeStream.on('error', (err) => {
      console.error('Settings change stream error:', err.message);
    });

    io.on('connection', (socket) => {
      console.log('Realtime client connected:', socket.id);
    });

    const server = httpServer.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));

    /* release the port and the DB connection promptly on shutdown —
       without this, nodemon's restart-on-change (and `rs`) can race
       the old process's teardown and hit EADDRINUSE on the new one */
    const shutdown = () => {
      changeStream.close().catch(() => {});
      settingsChangeStream.close().catch(() => {});
      server.close(() => {
        mongoose.connection.close(false).then(() => process.exit(0));
      });
    };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
    process.once('SIGUSR2', shutdown); // nodemon's restart signal
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
