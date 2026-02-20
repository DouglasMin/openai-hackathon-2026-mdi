# Demo Input Prompts - Scenario C: Purchase Requisition to Multi-step Approval

Use these prompts with external image-generation AI to create demo/test inputs.

Global constraints:
- Resolution: 1366x768
- Style: enterprise procurement SaaS, Korean UI labels, no watermark
- Straight desktop screenshot, full app frame visible
- PNG output

---

## 1) Happy Path Set (7 images, chronological)

Output filenames:
- `01_procurement_dashboard.png`
- `02_pr_list.png`
- `03_create_pr_start.png`
- `04_item_and_budget_entry.png`
- `05_approval_line_setup.png`
- `06_submit_pr_success.png`
- `07_manager_approval.png`

Master style prompt:
```
Create realistic procurement workflow web app screenshots in Korean locale, 1366x768 desktop, consistent design system across all images (same sidebar/header/table/button styles), no real brand logo, no watermark.
```

Per-image prompts:

`01_procurement_dashboard.png`
```
Scene: Procurement dashboard.
KPI cards: 신규 구매요청, 승인대기, 반려건, 평균 승인시간.
Show monthly spend chart and recent request list.
Sidebar: 대시보드, 구매요청, 결재함, 계약, 공급사, 설정.
```

`02_pr_list.png`
```
Scene: Purchase request list page.
Title: 구매요청 관리.
Filters: 상태, 부서, 예산코드, 요청일.
Table columns: 요청번호, 요청자, 품목요약, 금액, 상태, 결재단계.
Top-right button: 구매요청 작성.
```

`03_create_pr_start.png`
```
Scene: Same list page emphasizing 구매요청 작성 button as next action.
Hover/focus state on the button.
No modal opened.
```

`04_item_and_budget_entry.png`
```
Scene: Purchase request form step 1.
Sections: 기본정보, 품목정보, 예산정보.
Filled fields: 품목명, 수량, 단가, 공급사, 예산코드, 사용목적.
Buttons: 임시저장, 다음.
```

`05_approval_line_setup.png`
```
Scene: Form step 2 for approval workflow.
Show approval line builder with 2-3 approvers (팀장, 부서장, 재무).
Show policy check message (예: 금액 5,000,000원 이상 재무 필수).
Primary button visible: 결재상신.
```

`06_submit_pr_success.png`
```
Scene: Submission complete.
Return to request list with success toast: 구매요청이 상신되었습니다.
New request row appears with 상태=승인대기.
```

`07_manager_approval.png`
```
Scene: Manager approval inbox/detail page.
Show request details and action buttons: 승인, 반려, 재요청.
Display approval timeline panel with current 단계 highlighted.
```

---

## 2) Micro-step Set (1 complex screenshot)

Output filename:
- `01_complex_pr_form.png`

Prompt:
```
Generate one dense procurement request screen (Korean, 1366x768) for micro-step extraction.
Include:
1) Multi-line item grid (품목, 수량, 단가, 합계)
2) Budget allocation panel with remaining budget bar
3) Vendor comparison panel
4) Approval line editor
5) Submit action cluster (임시저장, 결재상신)
Make all zones clearly distinct so 3-5 micro-steps can target different areas.
No watermark.
```

---

## 3) Fallback / Recovery Set (1 low-quality screenshot)

Output filename:
- `01_low_quality_pr.png`

Prompt:
```
Generate a slightly degraded procurement form/list screenshot (Korean UI, 1366x768).
Use mild blur, reduced sharpness, and low contrast while preserving overall layout recognition.
Ensure at least one table/grid and one action button remain visible.
No watermark.
```

