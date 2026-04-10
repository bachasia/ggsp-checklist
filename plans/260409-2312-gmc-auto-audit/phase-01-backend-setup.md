---
title: Phase 01 — Backend Setup
status: completed
---

# Phase 01 — Backend Setup

## Overview

Tạo Node.js + Express server với SSE streaming, in-memory cache, và per-module timeout.

## Requirements

- Node.js >= 18, Express, Playwright
- CORS configured cho frontend domain
- Per-module timeout 8s (parallel checks), tổng job ≤ 35s
- Graceful error handling (anti-bot, invalid URL, timeout)
- In-memory cache: same domain reuse results 1h TTL
- SSE endpoint để stream check-by-check progress về frontend

## Files to Create

- `backend/package.json`
- `backend/server.js`
- `backend/ecosystem.config.js`

## Implementation Steps

1. Init `backend/package.json`:
   ```json
   {
     "name": "gmc-audit-backend",
     "type": "module",
     "dependencies": {
       "express": "^4",
       "playwright": "^1",
       "cors": "^2"
     }
   }
   ```

2. `backend/server.js` — Express app với 2 endpoints:

   **`POST /api/audit`** — trigger audit, trả về `{ jobId }`:
   - Validate URL (must be http/https)
   - Check in-memory cache (Map keyed by domain, TTL 1h)
   - Nếu cache hit → trả kết quả ngay
   - Nếu miss → spawn crawler async, lưu jobId
   - Rate limit: 1 concurrent job per domain (503 nếu busy)

   **`GET /api/audit/stream/:jobId`** — SSE stream kết quả:
   - Header: `Content-Type: text/event-stream`
   - Emit `event: result` cho mỗi check hoàn thành
   - Emit `event: done` khi xong tất cả
   - Emit `event: error` nếu có lỗi nghiêm trọng

   ```js
   // SSE format
   res.write(`event: result\ndata: ${JSON.stringify({ id, status, detail })}\n\n`);
   res.write(`event: done\ndata: ${JSON.stringify({ summary })}\n\n`);
   ```

3. `backend/ecosystem.config.js` — PM2 config:
   ```js
   { name: 'gmc-audit', script: 'server.js', instances: 1, max_memory_restart: '500M' }
   ```

## In-memory Cache Design

```js
// cache.js (simple Map, no Redis needed)
const cache = new Map(); // key: domain, value: { results, timestamp }
const TTL = 60 * 60 * 1000; // 1 hour

export function getCached(domain) {
  const entry = cache.get(domain);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > TTL) { cache.delete(domain); return null; }
  return entry.results;
}
export function setCached(domain, results) {
  cache.set(domain, { results, timestamp: Date.now() });
}
```

## Todo

- [x] `npm init` + install deps
- [x] Tạo `server.js` với `POST /api/audit` + `GET /api/audit/stream/:jobId`
- [x] Tạo `cache.js` — in-memory domain cache
- [x] Tạo `ecosystem.config.js` cho PM2
- [x] Test SSE stream với `curl --no-buffer`

## Success Criteria

- `POST /api/audit` trả về `{ jobId }` không lỗi
- `GET /api/audit/stream/:jobId` stream SSE events về client
- Cache hit trả kết quả ngay (< 100ms)
- 2nd request cùng domain trong 1h → dùng cache
