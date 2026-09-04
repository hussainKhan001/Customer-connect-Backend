import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './db.js';
import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import projectsRouter from './routes/projects.js';
import usersRouter from './routes/users.js';
import Customer from './models/Customer.js';
import { requireAuth, requirePermission } from './lib/auth.js';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const app = express();
/* credentials:true + a specific origin (not '*') is required for the
   httpOnly auth cookie to actually be sent/accepted cross-origin */
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/customers', requireAuth, customersRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/users', requireAuth, requirePermission('User management — add/edit/deactivate accounts'), usersRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  /* multer (file upload) rejections are user-facing validation errors,
     not server faults — surface them as a normal field error instead
     of a generic 500 */
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ errors: { file: 'File is too large — max 10MB.' } });
  if (err.message === 'UNSUPPORTED_FILE_TYPE') return res.status(400).json({ errors: { file: 'Only PDF, JPG or PNG files are allowed.' } });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: FRONTEND_ORIGIN, credentials: true } });

connectDB()
  .then(() => {
    /* MongoDB Change Streams require a replica set — Atlas clusters
       (and any local `rs.initiate()`'d instance) qualify. Any write to
       the customers collection — from this API, a seed run, or someone
       editing directly in Compass — pushes a live event to every
       connected browser tab. */
    const changeStream = Customer.watch();
    changeStream.on('change', (change) => {
      io.emit('customers:changed', { operationType: change.operationType });
    });
    changeStream.on('error', (err) => {
      console.error('Change stream error:', err.message);
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
