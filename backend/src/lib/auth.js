import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { hasPermission } from './permissions.js';

const COOKIE_NAME = 'token';
const TOKEN_TTL = '8h';

export function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id ?? user._id?.toString(), email: user.email, name: user.name, role: user.role },
    secret(),
    { expiresIn: TOKEN_TTL }
  );
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

/* attaches req.user = { id, email, name, role } from the httpOnly
   cookie, or 401s. Every /api/customers and /api/projects route sits
   behind this — see backend/src/index.js. */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.user = jwt.verify(token, secret());
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — please sign in again' });
  }
}

/* 403s unless req.user's role has at least some access (not 'N') to
   the named PERMS capability row. Must run after requireAuth. */
export function requirePermission(capabilityLabel) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not signed in' });
    if (!hasPermission(req.user.role, capabilityLabel)) {
      return res.status(403).json({ error: `Your role (${req.user.role}) does not have access to: ${capabilityLabel}` });
    }
    next();
  };
}
