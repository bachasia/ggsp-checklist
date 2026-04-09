---
title: Phase 01 — Backend Setup
status: pending
---

# Phase 01 — Backend Setup

## Overview

Tạo Node.js + Express server làm nền cho crawl API.

## Requirements

- Node.js >= 18, Express, Playwright
- CORS configured cho frontend domain
- Timeout 30s per request
- Graceful error handling (anti-bot, invalid URL, timeout)

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

2. `backend/server.js` — Express app:
   - `POST /api/audit` → validate URL → call crawler → return results
   - Input validation: must be http/https URL
   - Timeout: 30s via `AbortController`
   - Rate limit: 1 concurrent job (queue hoặc 503 nếu busy)

3. `backend/ecosystem.config.js` — PM2 config:
   ```js
   { name: 'gmc-audit', script: 'server.js', instances: 1, max_memory_restart: '400M' }
   ```

## Todo

- [ ] `npm init` + install deps
- [ ] Tạo `server.js` với Express + CORS + `/api/audit` endpoint
- [ ] Tạo `ecosystem.config.js` cho PM2
- [ ] Test endpoint với `curl`

## Success Criteria

- `curl -X POST http://localhost:3001/api/audit -d '{"url":"https://google.com"}'` trả về JSON không lỗi
