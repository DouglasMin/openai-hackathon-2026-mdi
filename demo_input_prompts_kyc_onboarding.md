# Demo Input Prompts - Scenario D: Corporate KYC Onboarding Workflow

Use these prompts with external image-generation AI to create demo/test inputs.

Global constraints:
- Resolution: 1366x768
- Style: fintech/compliance SaaS, Korean UI labels, no watermark
- Straight desktop screenshot, consistent layout across set
- PNG output

---

## 1) Happy Path Set (7 images, chronological)

Output filenames:
- `01_kyc_dashboard.png`
- `02_kyc_case_list.png`
- `03_start_new_kyc.png`
- `04_company_profile_entry.png`
- `05_beneficial_owner_and_docs.png`
- `06_submit_kyc_success.png`
- `07_compliance_approval.png`

Master style prompt:
```
Create realistic corporate KYC onboarding web app screenshots in Korean locale, desktop 1366x768, with consistent design style across all images. Show enterprise compliance UX patterns (status badges, risk labels, document checks). No real logos, no watermark.
```

Per-image prompts:

`01_kyc_dashboard.png`
```
Scene: KYC operations dashboard.
KPI cards: 신규 케이스, 심사 대기, 고위험 케이스, 승인률.
Include risk distribution chart and pending review table.
Sidebar: 대시보드, KYC 케이스, 문서검증, 리스크심사, 설정.
```

`02_kyc_case_list.png`
```
Scene: KYC case list.
Title: 법인 고객 KYC 관리.
Filters: 상태, 리스크등급, 국가, 담당자, 생성일.
Table columns: 케이스ID, 회사명, 국가, 리스크, 상태, 담당자.
Top-right primary button: 신규 KYC 등록.
```

`03_start_new_kyc.png`
```
Scene: Same list page emphasizing 신규 KYC 등록 button.
Clear hover/focus state on button.
No modal open yet.
```

`04_company_profile_entry.png`
```
Scene: KYC form step 1.
Sections: 회사 기본정보, 사업자 정보, 주소.
Fields populated: 법인명, 등록번호, 설립일, 업종, 국가.
Buttons: 임시저장, 다음.
```

`05_beneficial_owner_and_docs.png`
```
Scene: KYC form step 2.
Sections: 실소유자(UBO) 정보, 제재리스트 확인, 필수 서류 업로드.
Show at least one UBO row and document chips.
Include one warning badge for missing or expiring document.
Primary action: 제출.
```

`06_submit_kyc_success.png`
```
Scene: Submission success.
Back to case list with success toast: KYC 케이스가 제출되었습니다.
New case row near top with 상태=심사대기.
```

`07_compliance_approval.png`
```
Scene: Compliance review detail page.
Show risk score panel, watchlist check results, and final action controls (승인, 보완요청, 반려).
Approved state visible with reviewer and timestamp.
```

---

## 2) Micro-step Set (1 complex screenshot)

Output filename:
- `01_complex_kyc_review.png`

Prompt:
```
Generate one dense corporate KYC review screen in Korean (1366x768) suitable for micro-step extraction.
Include:
1) Company profile summary card
2) Beneficial ownership tree/table
3) Document verification checklist with pass/fail badges
4) Risk scoring and sanctions screening panel
5) Decision controls (승인, 보완요청, 반려)
Design it with multiple distinct regions so 3-5 micro-steps can be mapped to one screenshot.
No watermark.
```

---

## 3) Fallback / Recovery Set (1 low-quality screenshot)

Output filename:
- `01_low_quality_kyc.png`

Prompt:
```
Generate a moderately degraded KYC case screen (Korean UI, 1366x768) for fallback testing.
Apply slight blur, low contrast, and compression artifacts while preserving broad structure visibility.
Ensure one key action button and one data table/card remain visible but boundaries are uncertain.
No watermark.
```

