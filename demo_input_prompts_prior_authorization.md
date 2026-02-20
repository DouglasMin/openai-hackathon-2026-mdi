# Demo Input Prompts - Scenario B: Medical Prior Authorization Workflow

Use these prompts with external image-generation AI to create demo/test inputs.

Global constraints:
- Resolution: 1366x768 (consistent)
- Style: modern healthcare operations SaaS, Korean UI labels, no watermark
- Straight desktop screenshot, full app layout visible
- PNG output

---

## 1) Happy Path Set (7 images, chronological)

Output filenames:
- `01_pa_dashboard.png`
- `02_pa_request_list.png`
- `03_start_new_request.png`
- `04_patient_and_diagnosis.png`
- `05_treatment_and_documents.png`
- `06_submit_request_success.png`
- `07_approval_result.png`

Master style prompt:
```
Create realistic healthcare prior authorization web app screenshots in Korean locale, desktop 1366x768, consistent visual style across all images (same sidebar/header/cards/buttons), no real brand logo, no watermark.
```

Per-image prompts:

`01_pa_dashboard.png`
```
Scene: Prior authorization operations dashboard.
Show KPI cards: 신규 요청, 검토 대기, 승인률, 평균 처리시간.
Include queue chart and urgent cases table.
Sidebar: 대시보드, 사전승인요청, 임상검토, 결과통보, 설정.
```

`02_pa_request_list.png`
```
Scene: Request list page.
Title: 사전승인 요청 관리.
Filters: 상태, 진료과, 보험유형, 요청일.
Table columns: 요청번호, 환자명, 진단코드, 처방, 상태, 담당자.
Top-right button: 새 요청 생성.
```

`03_start_new_request.png`
```
Scene: Same request list page emphasizing 새 요청 생성 button as next action.
Cursor near button, clear focus.
No modal yet.
```

`04_patient_and_diagnosis.png`
```
Scene: New request form step 1.
Sections: 환자 정보, 보험 정보, 진단 정보.
Fields populated: 환자명, 생년월일, 가입자번호, ICD-10 코드, 주진단.
Buttons: 이전, 다음, 임시저장.
```

`05_treatment_and_documents.png`
```
Scene: Request form step 2.
Sections: 처치/약제 정보, 의료적 필요성, 첨부 문서.
Show uploaded document chips and one missing required document warning.
Primary action button visible: 제출.
```

`06_submit_request_success.png`
```
Scene: Request submitted successfully.
Return to list page with success toast: 사전승인 요청이 제출되었습니다.
New request row at top with 상태=검토대기.
```

`07_approval_result.png`
```
Scene: Request detail result page.
Show decision state 승인 with 승인일 and 승인번호.
Display approved scope summary and notes panel.
```

---

## 2) Micro-step Set (1 complex screenshot)

Output filename:
- `01_complex_pa_review.png`

Prompt:
```
Generate one dense prior authorization review screen in Korean (1366x768) optimized for micro-step extraction.
Include:
1) Patient summary card
2) Diagnosis and guideline mapping panel
3) Treatment/procedure request detail block
4) Attached document preview list with statuses
5) Decision controls (추가자료요청, 조건부승인, 승인, 반려)
Ensure many distinct clickable/attention zones suitable for 3-5 micro-steps.
No watermark.
```

---

## 3) Fallback / Recovery Set (1 low-quality screenshot)

Output filename:
- `01_low_quality_pa.png`

Prompt:
```
Generate a moderately degraded prior authorization list screenshot (Korean UI, 1366x768).
Apply mild blur, slight noise, and lowered contrast while keeping basic layout recognizable.
Ensure one main action button and one table are visible but element boundaries are ambiguous.
No watermark.
```

