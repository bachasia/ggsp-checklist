---
title: Phase 02 — Crawl & Check Logic
status: completed
---

# Phase 02 — Crawl & Check Logic

## Overview

Viết logic crawl + auto-check ~65 tiêu chí từ `data.json`. Các modules chạy song song (Promise.all) với per-module timeout 8s. Mỗi check emit SSE event ngay khi hoàn thành.

## Files to Create

- `backend/crawler/index.js` — orchestrator (parallel + SSE emit)
- `backend/crawler/utils.js` — shared helpers
- `backend/crawler/checks/technical.js` (+3 new checks)
- `backend/crawler/checks/meta.js` (+1 new check)
- `backend/crawler/checks/schema.js` (+1 new check)
- `backend/crawler/checks/pages.js` (+1 new check)
- `backend/crawler/checks/contact.js`
- `backend/crawler/checks/ecommerce.js`

## Parallel Execution Pattern

```js
// crawler/index.js
const modules = [technical, meta, schema, pages, contact, ecommerce];
const results = await Promise.all(
  modules.map(mod =>
    Promise.race([
      mod.run(page, url, emit),   // emit(result) → SSE event
      timeout(8000, mod.name)     // per-module timeout → mark as manual
    ])
  )
);
```

- `emit(result)` gọi SSE write ngay khi từng check xong
- Module timeout → tất cả checks của module đó → status: "manual"
- 1 module fail không ảnh hưởng module khác

## Check Mapping (criteria id → check module)

### technical.js — ids: 1-11 + 3 new
| id | Criteria | Method |
|----|----------|--------|
| 1 | HTTPS | `url.startsWith('https')` |
| 2 | HTTP→HTTPS redirect | `fetch('http://...')` check final URL |
| 3 | SSL valid | `tls.connect` check cert expiry |
| 4 | No 404 links | Playwright: collect all `<a>` hrefs, fetch each (limit top 20) |
| 5 | PageSpeed ≥50 | PageSpeed Insights API (free, no key needed) |
| 6 | No malware | VirusTotal URL API (optional, skip if no key) |
| 7 | Mobile responsive | Playwright: check `<meta name="viewport">` |
| 8 | robots.txt exists | `fetch(origin + '/robots.txt')` |
| 9 | sitemap.xml | `fetch(origin + '/sitemap.xml')` |
| 10 | Structured data | Playwright: parse `<script type="application/ld+json">` |
| 11 | Favicon | Playwright: check `<link rel="icon">` or `/favicon.ico` |
| **NEW** | Cookie consent banner | DOM: detect common selectors (`#cookie`, `.cookie-banner`, `[aria-label*=cookie]`, `cookieyes`, `osano`) |
| **NEW** | Image alt text coverage | `$('img')` ratio: count `img[alt]` / total `img` ≥ 80% → pass |
| **NEW** | Mobile viewport emulation | Playwright: re-render at 375px width, check no horizontal overflow |

### meta.js — ids: 12,13,14,15,16,17 + 1 new
| id | Criteria | Method |
|----|----------|--------|
| 12 | Business email visible | Playwright: regex scan page text for email |
| 13 | Phone visible | Playwright: regex scan for phone patterns |
| 17 | Logo present | Playwright: `img[alt*=logo]` or header `<img>` |
| — | OG:title, OG:description | `<meta property="og:title">` |
| — | Meta description | `<meta name="description">` |
| — | Canonical tag | `<link rel="canonical">` |
| **NEW** | OG:image | `<meta property="og:image">` exists + non-empty |

### schema.js — ids từ "Cài Đặt GMC" + 1 new
| Check | Method |
|-------|--------|
| Product schema | JSON-LD có `@type: Product` |
| Organization schema | JSON-LD có `@type: Organization` |
| BreadcrumbList | JSON-LD có `@type: BreadcrumbList` |
| **NEW** | AggregateRating | JSON-LD có `@type: AggregateRating` (social proof) |

### pages.js — policy page existence + 1 new
| id | Page | Method |
|----|------|--------|
| 50 | Shipping policy | Footer/nav links: "vận chuyển", "shipping" |
| 61 | Return/refund policy | "đổi trả", "hoàn tiền", "return", "refund" |
| 72 | Privacy policy | "bảo mật", "privacy" |
| 87 | Terms of service | "điều khoản", "terms" |
| 43 | Contact page | "liên hệ", "contact" |
| **NEW** | Search functionality | `form[role=search]`, `input[type=search]`, `input[placeholder*=tìm]` |

### contact.js — ids: 43-49
| Check | Method |
|-------|--------|
| Contact page exists | pages.js result |
| Email visible | Regex: `/[\w.-]+@[\w.-]+\.\w+/` |
| Phone visible | Regex: Vietnamese phone patterns |
| Address visible | Heuristic: street/ward/city keywords |

### ecommerce.js — ids từ "Trang Sản Phẩm", "Giá Cả"
| Check | Method |
|-------|--------|
| Product image | `<img>` trên product page, check kích thước ≥ 100px |
| Price visible | Regex: price patterns (VND, đ, $) |
| Add to cart button | "thêm vào giỏ", "add to cart", "mua ngay" |
| Currency clear | Detect currency symbol |

## Result Schema

```js
{
  id: "1",           // matches data.json id
  status: "pass" | "fail" | "manual",
  detail: "SSL valid, expires 2026-12-01",  // optional
  module: "technical"  // for grouping in frontend
}
```

## Implementation Steps

1. `crawler/utils.js`: `fetchWithTimeout(url, ms)`, `extractLinks(page)`, `findText(page, patterns)`, `withTimeout(promise, ms, name)`
2. `crawler/index.js`: launch Playwright, run all modules via `Promise.all`, emit SSE per result, close browser
3. Implement each check module: `export async function run(page, url, emit) → void` (emit results directly)
4. Error boundary per check: wrap each check in try/catch → status "manual" on error

## Todo

- [x] `utils.js` — `fetchWithTimeout`, `findText`, `withTimeout`
- [x] `checks/technical.js` (incl. cookie banner, alt text, viewport)
- [x] `checks/meta.js` (incl. OG image)
- [x] `checks/schema.js` (incl. AggregateRating)
- [x] `checks/pages.js` (incl. search functionality)
- [x] `checks/contact.js`
- [x] `checks/ecommerce.js`
- [x] `crawler/index.js` — parallel orchestration, SSE emit
- [x] Manual test với 1 real e-commerce URL

## Success Criteria

- Crawl real shop URL → trả về ≥60 criteria với status đúng
- Modules chạy parallel, tổng < 25s (8s timeout per module)
- SSE events emit từng check khi hoàn thành (không đợi hết)
- Không crash khi target site block crawler
