---
title: Phase 02 — Crawl & Check Logic
status: pending
---

# Phase 02 — Crawl & Check Logic

## Overview

Viết logic crawl + auto-check ~55 tiêu chí từ `data.json`.

## Files to Create

- `backend/crawler/index.js` — orchestrator
- `backend/crawler/utils.js` — shared helpers
- `backend/crawler/checks/technical.js`
- `backend/crawler/checks/meta.js`
- `backend/crawler/checks/schema.js`
- `backend/crawler/checks/pages.js`
- `backend/crawler/checks/contact.js`
- `backend/crawler/checks/ecommerce.js`

## Check Mapping (criteria id → check module)

### technical.js — ids: 1,2,3,4,5,6,7,8,9,10,11
| id | Criteria | Method |
|----|----------|--------|
| 1 | HTTPS | `url.startsWith('https')` |
| 2 | HTTP→HTTPS redirect | `fetch('http://...')` check final URL |
| 3 | SSL valid | `tls.connect` check cert expiry |
| 4 | No 404 links | Playwright: collect all `<a>` hrefs, fetch each (limit top 20) |
| 5 | PageSpeed ≥50 | PageSpeed Insights API (free, no key needed for basic) |
| 6 | No malware | VirusTotal URL API (optional, skip if no key) |
| 7 | Mobile responsive | Playwright: check `<meta name="viewport">` |
| 8 | robots.txt exists | `fetch(origin + '/robots.txt')` |
| 9 | sitemap.xml | `fetch(origin + '/sitemap.xml')` |
| 10 | Structured data | Playwright: parse `<script type="application/ld+json">` |
| 11 | Favicon | Playwright: check `<link rel="icon">` or `/favicon.ico` |

### meta.js — ids: 12,13,14,15,16,17
| id | Criteria | Method |
|----|----------|--------|
| 12 | Business email visible | Playwright: regex scan page text for email |
| 13 | Phone visible | Playwright: regex scan for phone patterns |
| 17 | Logo present | Playwright: `<img[alt*=logo]>` or header `<img>` |
| — | OG:title, OG:description | `<meta property="og:title">` |
| — | Meta description | `<meta name="description">` |
| — | Canonical tag | `<link rel="canonical">` |

### schema.js — ids từ "Cài Đặt GMC"
| Check | Method |
|-------|--------|
| Product schema | JSON-LD có `@type: Product` |
| Organization schema | JSON-LD có `@type: Organization` |
| BreadcrumbList | JSON-LD có `@type: BreadcrumbList` |

### pages.js — policy page existence checks
| id | Page | Method |
|----|------|--------|
| 50 | Shipping policy | Search footer/nav links for keywords: "vận chuyển", "shipping" |
| 61 | Return/refund policy | Keywords: "đổi trả", "hoàn tiền", "return", "refund" |
| 72 | Privacy policy | Keywords: "bảo mật", "privacy" |
| 87 | Terms of service | Keywords: "điều khoản", "terms" |
| 43 | Contact page | Keywords: "liên hệ", "contact" |

### contact.js — ids: 43-49
| Check | Method |
|-------|--------|
| Contact page exists | pages.js result |
| Email visible | Regex: `/[\w.-]+@[\w.-]+\.\w+/` |
| Phone visible | Regex: Vietnamese phone patterns |
| Address visible | Heuristic: look for street/ward/city keywords |

### ecommerce.js — ids từ "Trang Sản Phẩm", "Giá Cả"
| Check | Method |
|-------|--------|
| Product image | `<img>` trên product page, check kích thước ≥ 100px |
| Price visible | Regex: price patterns (VND, đ, $) |
| Add to cart button | Keywords: "thêm vào giỏ", "add to cart", "mua ngay" |
| Currency clear | Detect currency symbol |

## Result Schema

```js
{
  id: "1",           // matches data.json id
  status: "pass" | "fail" | "manual",
  detail: "SSL valid, expires 2026-12-01"  // optional detail
}
```

## Implementation Steps

1. `crawler/utils.js`: `fetchPage(url)`, `extractLinks(page)`, `findText(page, patterns)`
2. `crawler/index.js`: launch Playwright, run all check modules, aggregate results
3. Implement each check module, export `run(page, url)` → `Result[]`
4. Handle errors per check (one check failing không làm crash toàn bộ)

## Todo

- [ ] `utils.js` — shared helpers
- [ ] `checks/technical.js`
- [ ] `checks/meta.js`
- [ ] `checks/schema.js`
- [ ] `checks/pages.js`
- [ ] `checks/contact.js`
- [ ] `checks/ecommerce.js`
- [ ] `crawler/index.js` — orchestrate all modules
- [ ] Unit test với 1 real URL

## Success Criteria

- Crawl `https://example-shop.com` → trả về kết quả ≥50 criteria với status đúng
- Tổng thời gian crawl < 30s
- Không crash khi target site block crawler
