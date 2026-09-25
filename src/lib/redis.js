/* Redis client — used for two concrete things (see routes/auth.js's
   login rate-limit and routes/customers.js's list cache), not added
   speculatively. Optional infrastructure: REDIS_URL isn't set in every
   environment yet (this app ran fine without it for a long time), so
   everything that touches Redis must degrade to "no cache / no rate
   limit" rather than 500ing the whole API when it's absent or down —
   Redis is an optimization/hardening layer here, never the source of
   truth for anything (Mongo is, always). */
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

let client = null;
if (REDIS_URL) {
  client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => Math.min(times * 200, 2000),
    lazyConnect: false,
  });
  client.on('error', (err) => {
    // logged, never thrown — a Redis blip must not take the API down with it
    console.error('Redis error (continuing without cache/rate-limit for affected calls):', err.message);
  });
  client.on('connect', () => console.log('Redis connected'));
} else {
  console.log('REDIS_URL not set — running without Redis (no list cache, no login rate-limit).');
}

/* every call site awaits these and treats a null/false return as
   "Redis isn't available right now", not as an error to propagate */
export async function redisGet(key) {
  if (!client) return null;
  try { return await client.get(key); } catch { return null; }
}

export async function redisSet(key, value, ttlSeconds) {
  if (!client) return false;
  try {
    if (ttlSeconds) await client.set(key, value, 'EX', ttlSeconds);
    else await client.set(key, value);
    return true;
  } catch { return false; }
}

export async function redisDel(key) {
  if (!client) return false;
  try { await client.del(key); return true; } catch { return false; }
}

/* atomic increment-and-expire, for the login rate-limit counter — sets
   the TTL only on the first increment (when the key was just created)
   so a steady trickle of attempts can't keep pushing the window back
   forever. */
export async function redisIncrWithExpiry(key, ttlSeconds) {
  if (!client) return null;
  try {
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, ttlSeconds);
    return count;
  } catch { return null; }
}

export function isRedisEnabled() {
  return !!client;
}

export default client;
