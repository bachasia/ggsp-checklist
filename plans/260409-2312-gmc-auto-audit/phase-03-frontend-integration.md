---
title: Phase 03 — Frontend Integration
status: pending
---

# Phase 03 — Frontend Integration

## Overview

Thêm tab "Tự động kiểm tra" vào `index.html` hiện tại.

## Files to Modify

- `index.html` — add Auto Audit tab + UI + JS logic

## UI Layout

```
[Checklist Tab] [Tự động kiểm tra Tab]
                ↓
┌─────────────────────────────────────┐
│  Nhập URL website cần kiểm tra      │
│  [https://example.com          ] [Kiểm tra] │
└─────────────────────────────────────┘

[Đang kiểm tra... ████████░░ 70%]     ← loading state

┌─ Kết quả ──────────────────────────┐
│  ✅ 38 PASS  ❌ 7 FAIL  👁 10 Manual│
│                                     │
│  Kỹ Thuật & Bảo Mật                │
│    ✅ HTTPS đang hoạt động          │
│    ✅ HTTP chuyển hướng HTTPS       │
│    ❌ SSL hết hạn: 2026-01-15       │
│    👁 Kiểm tra tay: Nội dung độc hại│
│                                     │
│  [Import kết quả vào Checklist →]   │
└─────────────────────────────────────┘
```

## Implementation Steps

1. **Tab switching**: Thêm tab button "Tự động kiểm tra" cạnh filter chips hiện tại
   - Hoặc dùng toggle riêng bên trên checklist section

2. **Audit form** (`#auditForm`):
   - Input URL với validation (must start with http/https)
   - Button "Bắt đầu kiểm tra" → POST `/api/audit`
   - Loading spinner + progress message

3. **Results renderer** (`#auditResults`):
   - Group kết quả theo section (giống checklist hiện tại)
   - Badge: ✅ PASS (green) / ❌ FAIL (red) / 👁 Manual (amber)
   - Show `detail` text nếu có
   - Summary bar: tổng PASS/FAIL/Manual counts

4. **Import function**:
   - Button "Import vào Checklist" → lọc items có `status: "pass"` → set `state[id] = true` → `saveState()` → re-render checklist
   - Confirm dialog trước khi import

5. **API config**:
   - Const `AUDIT_API_URL = 'https://your-vps.com/api/audit'` ở đầu script
   - Dễ thay đổi khi deploy

## Todo

- [ ] Thêm tab "Tự động kiểm tra" + toggle logic vào `index.html`
- [ ] Thêm audit form HTML
- [ ] Thêm results renderer JS function
- [ ] Thêm import-to-checklist function
- [ ] Style: consistent với design system hiện tại (Tailwind, dark mode)
- [ ] Test: mock API response, verify import works correctly

## Success Criteria

- Tab switch mượt, không break UI hiện tại
- Nhập URL → nhận kết quả → hiển thị đúng grouping
- Import PASS items → checklist được tick đúng
- Dark mode hoạt động
