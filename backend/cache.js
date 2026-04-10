// In-memory domain cache — no Redis needed for internal use
// Key: domain (hostname), Value: { results, summary, timestamp }
const cache = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour

export function getCached(domain) {
  const entry = cache.get(domain);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(domain);
    return null;
  }
  return entry;
}

export function setCached(domain, results, summary) {
  cache.set(domain, { results, summary, timestamp: Date.now() });
}

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > TTL_MS) cache.delete(key);
  }
}, TTL_MS);
