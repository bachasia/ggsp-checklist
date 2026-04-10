---
title: Phase 03 — Frontend Integration
status: completed
---

# Phase 03 — Frontend Integration

## Overview

Thêm tab "Tự động kiểm tra" vào `index.html` với SSE realtime streaming, score gauge chart, audit history (localStorage), và PDF export.

## Files to Modify

- `index.html` — add Auto Audit tab + UI + JS logic

## UI Layout

```
[Checklist Tab] [Tự động kiểm tra Tab]
                ↓
┌─────────────────────────────────────────────┐
│  Nhập URL website cần kiểm tra              │
│  [https://example.com              ] [Kiểm tra] │
└─────────────────────────────────────────────┘

[Đang kiểm tra... ████████░░ 42/65]    ← SSE realtime progress

┌─ Score ────────────────────────────────────┐
│     ✅ 45 PASS   ❌ 8 FAIL   👁 12 Manual   │
│  ●●●●●●●●●●●●●●●●●●●●●●○○○○○○○○  69%      │
│  PASS ▓▓▓▓▓▓▓▓▓▓  FAIL ░░░░  Manual ·····  │
└─────────────────────────────────────────────┘

┌─ Kết quả ──────────────────────────────────┐
│  🔴 Kỹ Thuật & Bảo Mật (crit.)            │
│    ✅ HTTPS đang hoạt động                  │
│    ❌ SSL hết hạn: 2026-01-15              │  ← color by level
│    👁 Kiểm tra tay: Nội dung độc hại       │
│                                             │
│  🟡 Cài Đặt GMC (warn.)                   │
│    ✅ Product schema có                     │
│                                             │
│  [📋 Copy Markdown] [📄 Xuất PDF] [Import vào Checklist →] │
└─────────────────────────────────────────────┘

┌─ Lịch sử kiểm tra ─────────────────────────┐
│  📅 2026-04-10 14:30  example.com  69% PASS │
│  📅 2026-04-08 09:15  example.com  52% PASS │  ← so sánh
│  [Xem chi tiết] [Xóa]                       │
└─────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Tab switching
Thêm tab button "Tự động kiểm tra" cạnh filter chips hiện tại (hoặc toggle riêng).

### 2. Audit form (`#auditForm`)
- Input URL với validation (must start with http/https)
- Button "Bắt đầu kiểm tra" → `POST /api/audit` → nhận `{ jobId }`
- Mở SSE connection: `new EventSource('/api/audit/stream/' + jobId)`

### 3. SSE Progress streaming
```js
const es = new EventSource(`${AUDIT_API_URL}/stream/${jobId}`);
es.addEventListener('result', e => {
  const result = JSON.parse(e.data);
  renderResult(result);   // append to results list
  updateProgress(result); // update counter + progress bar
});
es.addEventListener('done', e => {
  es.close();
  renderSummary();
  saveToHistory(url, allResults);
});
es.addEventListener('error', () => { es.close(); showError(); });
```
- Progress bar: `checked / total` (total = 65, khởi đầu 0)
- Render từng result ngay khi nhận → không đợi hết

### 4. Score gauge chart (CSS-only, no lib)
```html
<!-- Progress bar dạng gauge, CSS + inline style -->
<div class="gauge-bar">
  <div class="pass-bar" style="width: 69%"></div>
  <div class="fail-bar" style="width: 12%"></div>
  <div class="manual-bar" style="width: 19%"></div>
</div>
<div class="score-text">69% PASS (45/65)</div>
```
Dùng Tailwind utility classes, không cần canvas hay chart lib.

### 5. Results renderer
- Group theo section (dùng `data.json` sections làm reference)
- Severity color-coding:
  - 🔴 REQUIRED fail → `text-red-600 border-red-500`
  - 🟡 WARNING fail → `text-yellow-600 border-yellow-500`
  - 🔵 RECOMMENDED → `text-blue-500`
- Show `detail` text nếu có
- Badge: ✅ (green) / ❌ (red, severity-colored) / 👁 (amber)

### 6. Actions
**Copy Markdown**: Format kết quả thành Markdown table → `navigator.clipboard.writeText()`

**Export PDF**: Dùng `window.print()` với print CSS (`@media print`) — không cần thư viện:
```css
@media print {
  /* hide tab nav, filters, history panel */
  /* show only audit results */
}
```

**Import to checklist**: Lọc `status: "pass"` → `state[id] = true` → `saveState()` → re-render → confirm dialog trước

### 7. Audit history (localStorage)
```js
const HISTORY_KEY = 'gmc_audit_history';
function saveToHistory(url, results) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  history.unshift({ url, timestamp: Date.now(), results, score: calcScore(results) });
  if (history.length > 10) history.pop(); // keep last 10
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}
```
- Hiển thị list: URL, date, score %
- Click "Xem chi tiết" → load lại results từ history entry
- "Xóa" → remove from array + re-save

### 8. API config
```js
const AUDIT_API_URL = 'https://your-vps.com/api/audit';
```
Ở đầu script section — dễ thay đổi khi deploy.

## Todo

- [x] Thêm tab "Tự động kiểm tra" + toggle logic
- [x] Audit form HTML + URL validation
- [x] SSE connection handler (`EventSource`)
- [x] Realtime progress bar (SSE-driven)
- [x] Score gauge chart (CSS-only)
- [x] Results renderer với severity color-coding
- [x] Copy Markdown action
- [x] Print/PDF export (`window.print()` + print CSS)
- [x] Import-to-checklist function
- [x] Audit history (localStorage, last 10 audits)
- [x] Dark mode cho tất cả UI mới
- [x] Test: SSE stream live, history save/load, import correct

## Success Criteria

- Tab switch mượt, không break UI hiện tại
- SSE kết quả render từng item ngay khi nhận (không đợi hết)
- Score gauge hiển thị đúng PASS/FAIL/Manual ratio
- Import PASS items → checklist được tick đúng
- History lưu localStorage, load lại đúng
- Print/PDF export readable
- Dark mode hoạt động đầy đủ
