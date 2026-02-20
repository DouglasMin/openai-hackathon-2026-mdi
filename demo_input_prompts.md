# Demo Input Prompt Scripts (For External Image-Generation AI)

Use the scripts below to generate test input images for FlowTutor demos.

Global requirements for all images:
- Style: realistic enterprise SaaS web app UI (CRM), clean modern design, Korean locale text on UI labels if possible.
- Viewpoint: full-screen desktop screenshot, straight-on view (no perspective tilt).
- Resolution: `1366 x 768` (preferred) or `1440 x 900`, keep the same resolution within one set.
- Format: PNG.
- No watermarks, no logos from real companies, no browser chrome unless requested.
- Keep consistent visual theme across a set (same app style, same sidebar/header style).

---

## 1) Happy Path Set (7 images, chronological)

Goal:
- Create a clean end-to-end CRM lead registration sequence for standard FlowTutor generation demo.
- Output files must be named exactly:
  - `01_dashboard.png`
  - `02_leads_list.png`
  - `03_click_add_lead.png`
  - `04_fill_form_basic.png`
  - `05_fill_form_advanced.png`
  - `06_save_and_success.png`
  - `07_verify_new_lead.png`

### Master style prompt (apply to every image in this set)
```
Generate a high-fidelity enterprise CRM web app screenshot in Korean language UI, full desktop frame, resolution 1366x768, realistic SaaS layout with left sidebar navigation and top header. Keep the same visual identity across all images in this set: same colors, same typography, same card/button style, same spacing. Show clear clickable controls and form fields. No watermark, no external brand logo.
```

### Per-image scene prompts

#### `01_dashboard.png`
```
Scene: CRM dashboard landing page.
Visible elements:
- Left sidebar with items: 대시보드, 리드, 거래, 보고서, 설정
- Main area with KPI cards (이번 달 리드 수, 전환율, 신규 고객)
- A chart panel and a recent activity table
- Top-right user avatar and search bar
No modal open. Make this clearly the starting screen.
```

#### `02_leads_list.png`
```
Scene: Leads list page after clicking 리드 in sidebar.
Visible elements:
- Page title: 리드 관리
- Filter bar (상태, 담당자, 기간)
- Table of leads with columns: 이름, 회사, 이메일, 상태, 담당자, 생성일
- Top-right primary button: 리드 추가
Make the 리드 sidebar item visually active.
```

#### `03_click_add_lead.png`
```
Scene: Same leads list page, with cursor near or over the 리드 추가 button.
Visible elements:
- Keep table and filter bar from previous scene
- Emphasize the 리드 추가 button in top-right as next action target
Do not open modal yet; this is pre-click emphasis state.
```

#### `04_fill_form_basic.png`
```
Scene: Lead creation form opened.
Visible elements:
- Form title: 신규 리드 등록
- Basic fields filled: 이름, 회사명, 이메일, 전화번호
- Dropdown field for 상태 with value 신규
- Buttons at bottom-right: 취소, 저장
Form should occupy central content area in a card layout.
```

#### `05_fill_form_advanced.png`
```
Scene: Same lead creation form with additional fields expanded.
Visible elements:
- Additional fields: 직책, 유입경로, 예상매출, 메모
- Some fields partially filled to show progression
- Validation hint text under one field (e.g., 이메일 형식 확인)
- 저장 button still visible
Maintain continuity with previous image.
```

#### `06_save_and_success.png`
```
Scene: Save action completed.
Visible elements:
- Leads list page shown again
- Green success toast/snackbar in upper-right: 리드가 성공적으로 등록되었습니다
- Newly added lead appears near top row
Keep filters and table visible so the success context is obvious.
```

#### `07_verify_new_lead.png`
```
Scene: Verification step on leads list.
Visible elements:
- The newly created lead row is selected or highlighted
- Right side detail panel or inline expanded row showing saved fields
- Subtle confirmation state (e.g., 상태: 신규, 담당자 assigned)
This should feel like final confirmation screen.
```

---

## 2) Micro-step Set (1 complex screenshot)

Goal:
- Produce one dense UI screen where 3–5 micro-steps can be extracted from a single image.
- Output filename: `01_complex_form.png`

Prompt:
```
Generate one complex enterprise CRM form page screenshot (1366x768) designed for micro-step tutorial extraction.
Requirements:
- Korean UI labels
- Dense multi-section layout with many actionable areas:
  1) Left stepper or tabs (기본 정보, 영업 정보, 계약 정보, 첨부파일)
  2) Main form with 12+ fields (text inputs, dropdowns, date picker, checkbox group)
  3) A prominent top-right action area with 임시 저장, 검토 요청, 최종 저장 buttons
  4) Inline validation messages under at least 2 fields
  5) Optional help tooltip icons near labels
- Ensure clear visual separation so different bounding boxes can be drawn for multiple micro-steps.
- Keep all important controls fully visible (do not crop).
- No modal overlays, no motion blur, no watermark.
```

---

## 3) Fallback / Recovery Set (1 low-quality screenshot)

Goal:
- Create a hard-to-interpret screenshot to test uncertain bbox, needs-review flow, and manual editor correction.
- Output filename: `01_low_quality.png`

Prompt:
```
Generate a deliberately low-quality but still recognizable CRM leads page screenshot (1366x768) for QA fallback testing.
Requirements:
- Korean UI text
- Introduce moderate degradation:
  - slight blur
  - mild JPEG-like compression artifacts
  - reduced contrast
  - one partially obscured panel
- Keep at least one primary action button and one data table visible, but make exact element boundaries ambiguous.
- Do NOT make it completely unreadable.
- No watermark.
Purpose: this image should cause uncertainty in precise bbox detection and trigger human review workflow.
```

---

## Optional add-on prompt (if you also need a QA-lint sample later)

Filename suggestion: `bad_accessibility_course.png`
```
Generate a training content page screenshot intentionally containing accessibility anti-patterns:
- low contrast text on light background
- missing label near form input
- heading hierarchy inconsistency appearance
- icon-only button without text
Korean locale UI, 1366x768, no watermark.
```
