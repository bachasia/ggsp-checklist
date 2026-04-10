---
title: GMC Auto Audit — Web App + Backend
status: in_progress
progress: 75%
created: 2026-04-09
updated: 2026-04-10
---

# GMC Auto Audit — Node.js + Playwright + VPS

## Overview

Extend checklist web app với tab "Tự động kiểm tra":
- User nhập URL → backend crawl → auto-check ~65 tiêu chí → stream kết quả realtime qua SSE
- Nút "Import vào checklist" để tick các tiêu chí đã PASS
- Audit history lưu localStorage — xem lại và so sánh kết quả
- Score gauge chart (PASS/FAIL/MANUAL breakdown)
- Export kết quả PDF

## Phases

| # | Phase | Status | Progress |
|---|-------|--------|----------|
| 01 | [Backend Setup](phase-01-backend-setup.md) | done | 100% |
| 02 | [Crawl & Check Logic](phase-02-crawl-checks.md) | done | 100% |
| 03 | [Frontend Integration](phase-03-frontend-integration.md) | done | 100% |
| 04 | [Deploy & Config](phase-04-deploy.md) | pending | 0% |

## Architecture

```
[index.html] — Tab "Tự động kiểm tra"
      ↓ POST /api/audit { url }  →  GET /api/audit/stream (SSE)
[Node.js Express API — VPS]
      ↓ parallel Promise.all (per-module 8s timeout each)
[Playwright Browser — crawl target URL]
      ↓ checks/ (run in parallel)
  ├── technical.js  (HTTPS, SSL, robots, sitemap, viewport, alt text, cookie banner)
  ├── meta.js       (title, OG tags, canonical, favicon, OG image)
  ├── schema.js     (Product, Organization, BreadcrumbList, AggregateRating)
  ├── pages.js      (policy pages, search functionality)
  ├── contact.js    (phone, email, address)
  └── ecommerce.js  (product image, price, cart btn, currency)
      ↓ SSE stream: { event: "result", data: { id, status, detail } }
      ↓ SSE stream: { event: "done", data: { summary } }
[Frontend — realtime render, history, import to checklist, PDF export]
      ↓ localStorage: auditHistory[]
```

## File Structure

```
ggsp-checklist/
├── index.html          (modified — add Auto Audit tab)
├── data.json           (existing)
└── backend/
    ├── package.json
    ├── server.js
    ├── ecosystem.config.js  (PM2)
    └── crawler/
        ├── index.js       (orchestrator, parallel modules)
        ├── utils.js       (shared helpers)
        └── checks/
            ├── technical.js
            ├── meta.js
            ├── schema.js
            ├── pages.js
            ├── contact.js
            └── ecommerce.js
```

## Auto-Check Coverage (~65/142 criteria, ~46%)

| Section | Auto | Manual | Total | New checks |
|---------|------|--------|-------|------------|
| Kỹ Thuật & Bảo Mật | 13 | 1 | 11 | +cookie banner, +alt text coverage, +mobile viewport |
| Thông Tin Doanh Nghiệp | 7 | 5 | 12 | +OG image |
| Điều Hướng Header | 3 | 2 | 5 | +search functionality |
| Điều Hướng Footer | 5 | 9 | 14 | — |
| Trang Liên Hệ | 3 | 4 | 7 | — |
| CS Vận Chuyển | 1 | 10 | 11 | — |
| CS Đổi Trả | 1 | 10 | 11 | — |
| CS Bảo Mật | 1 | 7 | 8 | — |
| CS Thanh Toán | 1 | 6 | 7 | — |
| Điều Khoản DV | 1 | 2 | 3 | — |
| Trang Sản Phẩm | 7 | 6 | 13 | +BreadcrumbList schema |
| Giá Cả | 2 | 5 | 7 | — |
| Cài Đặt GMC | 4 | 6 | 10 | +AggregateRating schema |
| Tin Cậy & XH | 2 | 2 | 4 | +social proof detect |
| Nội Dung & Ngôn Ngữ | 2 | 4 | 6 | — |
| Thông Tin Điền | 0 | 13 | 13 | — |
| **TOTAL** | **~65** | **~77** | **142** | **+10 vs original** |

## Key Constraints

- Playwright on VPS: cần ~500MB RAM + Chromium
- Per-module timeout: 8s each (parallel) thay vì global 30s
- Anti-bot: graceful fallback nếu target site block crawler
- CORS: backend allow từ frontend domain
- In-memory cache: same domain → reuse results 1h TTL (KISS, no Redis)
