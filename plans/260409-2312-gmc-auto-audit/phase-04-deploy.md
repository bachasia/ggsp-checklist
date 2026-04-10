---
title: Phase 04 — Deploy & Config
status: pending
---

# Phase 04 — Deploy & Config

## Overview

Deploy backend lên VPS, config Nginx reverse proxy, serve frontend.

## Prerequisites

- VPS với Node.js >= 18, PM2, Nginx, Chromium/Playwright deps
- Domain hoặc IP public

## Implementation Steps

### 1. Install Playwright deps on VPS

```bash
npx playwright install chromium
npx playwright install-deps chromium
```

### 2. Upload backend

```bash
scp -r backend/ user@vps:/var/www/gmc-audit/
ssh user@vps "cd /var/www/gmc-audit && npm install --production"
```

### 3. Start với PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Nginx config

```nginx
# /etc/nginx/sites-available/gmc-audit
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    root /var/www/gmc-checklist;
    index index.html;

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;

        # SSE support — disable buffering for EventSource stream
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }
}
```

### 5. Update frontend API URL

Trong `index.html`, set:
```js
const AUDIT_API_URL = 'https://your-domain.com/api/audit';
```

### 6. HTTPS (Let's Encrypt)

```bash
certbot --nginx -d your-domain.com
```

## RAM Check

Playwright + Chromium cần ~300-500MB RAM khi crawl. Verify trước:
```bash
free -h  # cần ít nhất 512MB free
```

Nếu VPS ít RAM: set `--no-sandbox` và `--disable-dev-shm-usage` cho Chromium args.

## Todo

- [ ] Verify VPS RAM ≥ 512MB
- [ ] Install Node.js + PM2 + Playwright deps
- [ ] Upload và start backend
- [ ] Config Nginx + HTTPS
- [ ] Update `AUDIT_API_URL` trong `index.html`
- [ ] End-to-end test: crawl 1 real URL qua production endpoint

## Success Criteria

- `POST https://your-domain.com/api/audit` hoạt động từ browser
- Chromium không crash do thiếu RAM
- Nginx proxy đúng, HTTPS valid
