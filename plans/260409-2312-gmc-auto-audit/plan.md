---
title: GMC Auto Audit — Web App + Backend
status: pending
progress: 0%
created: 2026-04-09
---

# GMC Auto Audit — Node.js + Playwright + VPS

## Overview

Extend checklist web app với tab "Tự động kiểm tra":
- User nhập URL → backend crawl → auto-check ~55 tiêu chí → hiển thị PASS/FAIL/MANUAL
- Nút "Import vào checklist" để tick các tiêu chí đã PASS

## Phases

| # | Phase | Status | Progress |
|---|-------|--------|----------|
| 01 | [Backend Setup](phase-01-backend-setup.md) | pending | 0% |
| 02 | [Crawl & Check Logic](phase-02-crawl-checks.md) | pending | 0% |
| 03 | [Frontend Integration](phase-03-frontend-integration.md) | pending | 0% |
| 04 | [Deploy & Config](phase-04-deploy.md) | pending | 0% |

## Architecture

```
[index.html] — Tab "Tự động kiểm tra"
      ↓ POST /api/audit { url }
[Node.js Express API — VPS]
      ↓
[Playwright Browser — crawl target URL]
      ↓ checks/
  ├── technical.js  (HTTPS, SSL, speed, robots, sitemap)
  ├── meta.js       (title, OG tags, canonical, favicon)
  ├── schema.js     (structured data)
  ├── pages.js      (policy pages existence)
  ├── contact.js    (phone, email, address)
  └── ecommerce.js  (product image, price, cart btn)
      ↓
{ results: [{ id, status: "pass"|"fail"|"manual", detail }] }
      ↓
[Frontend — render results, import to checklist]
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
        ├── index.js
        ├── utils.js
        └── checks/
            ├── technical.js
            ├── meta.js
            ├── schema.js
            ├── pages.js
            ├── contact.js
            └── ecommerce.js
```

## Auto-Check Coverage (~55/142 criteria)

| Section | Auto | Manual | Total |
|---------|------|--------|-------|
| Kỹ Thuật & Bảo Mật | 10 | 1 | 11 |
| Thông Tin Doanh Nghiệp | 6 | 6 | 12 |
| Điều Hướng Header | 2 | 3 | 5 |
| Điều Hướng Footer | 5 | 9 | 14 |
| Trang Liên Hệ | 3 | 4 | 7 |
| CS Vận Chuyển | 1 | 10 | 11 |
| CS Đổi Trả | 1 | 10 | 11 |
| CS Bảo Mật | 1 | 7 | 8 |
| CS Thanh Toán | 1 | 6 | 7 |
| Điều Khoản DV | 1 | 2 | 3 |
| Trang Sản Phẩm | 6 | 7 | 13 |
| Giá Cả | 2 | 5 | 7 |
| Cài Đặt GMC | 3 | 7 | 10 |
| Tin Cậy & XH | 1 | 3 | 4 |
| Nội Dung & Ngôn Ngữ | 2 | 4 | 6 |
| Thông Tin Điền | 0 | 13 | 13 |
| **TOTAL** | **~55** | **~87** | **142** |

## Key Constraints

- Playwright on VPS: cần ~500MB RAM + Chromium
- Timeout: 30s per audit job
- Anti-bot: graceful fallback nếu target site block crawler
- CORS: backend allow từ frontend domain
