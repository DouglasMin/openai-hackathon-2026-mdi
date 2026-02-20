# Demo Input Prompts - Scenario A: Insurance Claim Intake to Approval

Use these prompts with external image-generation AI to create demo/test inputs.

Global constraints:
- Resolution: 1366x768 (consistent across all images)
- Style: realistic enterprise web app, Korean locale labels, no watermark
- View: straight desktop screenshot, full UI visible, no perspective distortion
- Format: PNG

---

## 1) Happy Path Set (7 images, chronological)

Output filenames:
- `01_claim_dashboard.png`
- `02_claim_list.png`
- `03_new_claim_start.png`
- `04_fill_claim_form.png`
- `05_upload_documents.png`
- `06_submit_success.png`
- `07_review_and_approve.png`

Master style prompt:
```
Create a realistic enterprise insurance operations web app screenshot in Korean UI, desktop resolution 1366x768, with consistent visual style across all images: same sidebar, header, tables, cards, and button style. No watermark or real brand logo.
```

Per-image prompts:

`01_claim_dashboard.png`
```
Scene: Claims operations dashboard.
Show KPI cards: 오늘 접수 건수, 심사 대기, 승인율.
Include a trend chart and recent claims table.
Left sidebar items: 대시보드, 클레임, 심사, 지급, 설정.
```

`02_claim_list.png`
```
Scene: Claims list page.
Title: 클레임 관리.
Show filters: 상태, 보험상품, 접수일.
Show table columns: 클레임번호, 고객명, 상품, 상태, 접수일, 담당자.
Top-right primary button: 새 클레임 접수.
```

`03_new_claim_start.png`
```
Scene: Same claims list page emphasizing the 새 클레임 접수 button as next action.
Cursor near the button or hover state highlighted.
No modal opened yet.
```

`04_fill_claim_form.png`
```
Scene: New claim intake form.
Sections: 고객 정보, 사고 정보, 보장 항목.
Fields filled: 이름, 연락처, 사고일, 사고유형, 청구금액.
Bottom-right buttons: 임시저장, 다음, 제출.
```

`05_upload_documents.png`
```
Scene: Claim form document section.
Upload area with required files: 진단서, 영수증, 신분증.
At least two files shown as uploaded chips.
One validation note visible for missing required file.
```

`06_submit_success.png`
```
Scene: Submission completed.
Back to claims list with a success toast: 클레임이 접수되었습니다.
Newly submitted claim row appears near top with 상태=심사대기.
```

`07_review_and_approve.png`
```
Scene: Underwriting/review page for the submitted claim.
Right panel shows decision controls: 보완요청, 반려, 승인.
Approved state shown with timestamp and 담당 심사자.
```

---

## 2) Micro-step Set (1 complex screenshot)

Output filename:
- `01_complex_claim_review.png`

Prompt:
```
Generate one dense insurance claim review screen in Korean (1366x768) designed for micro-step extraction.
Include:
1) Left claim timeline stepper (접수, 서류검증, 심사, 승인)
2) Center panel with claimant details and incident summary
3) Right evidence/documents panel with file preview list
4) Risk scoring widget and policy-rule checklist
5) Top-right actions: 보완요청, 승인, 반려
Ensure multiple clearly separable action regions for 3-5 micro-steps.
No modal overlay, no watermark.
```

---

## 3) Fallback / Recovery Set (1 low-quality screenshot)

Output filename:
- `01_low_quality_claim.png`

Prompt:
```
Generate a slightly degraded insurance claims list screenshot (1366x768, Korean UI) for fallback testing.
Apply mild blur, low contrast, and compression artifacts, but keep key controls barely recognizable.
Show at least one primary action button and one claims table.
Do not make it completely unreadable.
No watermark.
```

