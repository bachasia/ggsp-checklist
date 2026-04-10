import * as tls from 'tls';

// Run a promise with a timeout — resolves to fallback on timeout
export function withTimeout(promise, ms, fallback = []) {
  const timer = new Promise((resolve) => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timer]);
}

// Fetch a URL with timeout, return { ok, status, finalUrl }
export async function fetchHead(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status, finalUrl: res.url };
  } catch {
    clearTimeout(timer);
    return { ok: false, status: 0, finalUrl: url };
  }
}

// Fetch URL body as text with timeout
export async function fetchText(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Check SSL cert expiry — returns { valid: bool, daysLeft: number, expires: string }
export function checkSslCert(hostname) {
  return new Promise((resolve) => {
    const socket = tls.connect(443, hostname, { servername: hostname, rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      socket.destroy();
      if (!cert || !cert.valid_to) return resolve({ valid: false, daysLeft: 0, expires: null });
      const expires = new Date(cert.valid_to);
      const daysLeft = Math.floor((expires - Date.now()) / 86400000);
      resolve({ valid: daysLeft > 0, daysLeft, expires: expires.toISOString().split('T')[0] });
    });
    socket.on('error', () => resolve({ valid: false, daysLeft: 0, expires: null }));
    socket.setTimeout(5000, () => { socket.destroy(); resolve({ valid: false, daysLeft: 0, expires: null }); });
  });
}

// Build a result object
export function result(id, status, detail = '') {
  return { id: String(id), status, detail };
}
