# FlowTutor — 해커톤 MVP 프로젝트 제안서 & 개발 가이드라인 (Codex 전달용)
작성일: 2026-02-13 (KST)  
목표: **해커톤 본선 통과용 MVP** (1인 개발, 7일)  
포지셔닝: **데모 생성기 아님** → “업무 워크플로우를 **LMS 학습 모듈**로 자동 변환하는 **AI 교육 엔진**”

---

## 0) 이 문서의 목적 (Codex에게 전달하는 기준)
이 문서는 개발 AI(Codex)가 **같은 제품 그림**을 공유하도록 하는 “고정 스펙”입니다.
- 기술 스택/코드 구조는 Codex가 주도하되, **제품 정의/성공 기준/범위/산출물**은 이 문서를 기준으로 합니다.
- MVP는 기능 확장이 아니라 **데모 완성도**가 목적입니다.

---

## 1) Executive Summary
FlowTutor는 사용자가 **스크린샷(이미지 여러 장)**을 업로드하면 AI가 자동으로:
1. 단계별 튜토리얼(제목/지시문/하이라이트 박스)
2. 웹 기반 인터랙티브 플레이어(Next/Back, 진행률)
3. (선택) 단계별 보이스오버(TTS)
4. **SCORM 1.2 패키지(zip) Export** — *완료(Completed) 트래킹만*

을 생성하는 SaaS입니다.

**핵심 데모 메시지(해커톤용):**  
> “스크린샷만 올리면 30초 내에 **LMS에서 완료 추적 가능한 교육 모듈(SCORM)**이 나온다.”

---

## 2) MVP 의사결정(이미 확정된 것)
- 입력 방식: ✅ **스크린샷 업로드** (drag & drop, 다중 이미지)
- SCORM 목표: ✅ **SCORM 1.2**, ✅ **완료(Completed)만 트래킹**, ❌ 점수/성공(passed/failed) 트래킹은 MVP 제외
- 제품 성격: ✅ **교육툴** (LMS 연동) / ❌ “세일즈용 데모 생성기” 포지션 금지
- 목표: ✅ **해커톤 본선 통과용 완성도**가 1순위

---

## 3) 범위 정의 (Scope)
### 3.1 Must-Have (반드시 구현)
1. 스크린샷 업로드 (복수 이미지)
2. 스크린샷 순서 재정렬(드래그) + 기본 자동 정렬
3. AI 단계 생성(스크린샷 → steps JSON)
4. 튜토리얼 플레이어(웹): 이미지 + 하이라이트 + 지시문 + Next/Back
5. SCORM 1.2 Export(zip 다운로드)
6. SCORM 런타임: 완료 상태 기록(Completed)
7. 데모 프로젝트 1개(샘플) 탑재 + “AI 실패 시” 자동 로드(발표 안정장치)

### 3.2 Nice-to-Have (시간 남으면)
- 간단 편집 UI: step title / instruction 수정, highlight 박스 드래그 조정
- TTS 보이스오버(단계별 mp3 생성)

### 3.3 Must-Not-Have (MVP 금지 / 본선 전 제외)
- 크롬 익스텐션/자동 클릭 캡처
- UI diff 자동 업데이트(Self-healing)
- 멀티테넌시/SSO/권한/관리자 대시보드 고도화
- SCORM 점수(score) 트래킹
- 복잡한 분석(리포팅, heatmap 등)

---

## 4) 데모 워크플로우(샘플 시나리오) — “CRM 리드 등록”
해커톤 데모에서 사용될 **고정** 업무 플로우(샘플 화면을 직접 만들어도 됨):
1) 대시보드 진입  
2) Leads 이동  
3) Add Lead 클릭  
4) 필수 필드 입력(이름/회사/이메일/상태 등)  
5) Save  
6) 성공 토스트/리스트에 리드 추가 확인  

**목표:** 스크린샷 5~7장으로 단계가 명확히 나뉘고, 하이라이트(버튼/필드)가 시각적으로 분명해야 함.

---

## 5) 사용자 경험(UX) — 핵심 화면 4개
### 화면 A) 업로드
- Drag & drop 다중 업로드
- 썸네일 리스트 + “순서 재정렬”
- CTA: **Generate with AI**

### 화면 B) 생성중(Processing)
- 상태: uploading → generating → ready
- 진행 인디케이터
- 실패 시: “샘플 프로젝트 로드” 버튼 (발표 안정장치)

### 화면 C) 튜토리얼 플레이어
- step 이미지 렌더
- highlight overlay
- title + instruction
- Next/Back + progress (예: 2/6)
- (옵션) Audio 재생 버튼

### 화면 D) Export
- 버튼: **Export SCORM (zip)**
- 다운로드 링크/버튼
- 간단 안내: “SCORM Cloud/LMS에 업로드하여 Completed 확인”

---

## 6) AI 산출물 스키마 (반드시 고정)
Codex는 아래 스키마를 기준으로 AI 결과를 저장/렌더/Export 해야 함.

### 6.1 Step JSON (MVP 최소 스키마)
```json
{
  "tutorial_title": "string",
  "language": "ko-KR",
  "steps": [
    {
      "step_no": 1,
      "title": "string",
      "instruction": "string",
      "highlight": { "x": 0, "y": 0, "w": 0, "h": 0 },
      "tts_script": "string (optional)",
      "notes": "string (optional)"
    }
  ]
}
```

### 6.2 스키마 규칙(필수)
- step_no는 1부터 시작, 오름차순
- instruction은 1~2문장으로 짧고 명확하게
- highlight는 “추정치” 허용 (편집 UI로 보정 가능)
- tutorial_title은 자동 생성하되, 실패 시 기본값 제공

---

## 7) OpenAI 사용 요구사항(제품 기능의 본질)
### 7.1 AI가 반드시 해야 하는 일(핵심)
- 스크린샷들을 보고 **단계별 지시문** 생성
- 각 단계에서 **강조 영역(highlight bbox)** 제안
- (옵션) tts_script 생성

### 7.2 호출 전략(권장)
- Vision + Structured Outputs(JSON schema 준수)로 안정적으로 steps JSON 생성
- 실패/불확실 처리: “highlight를 확신 못 하면 (0,0,0,0) 허용 + notes에 안내”

### 7.3 성능 목표(해커톤용)
- 5~7장 기준 **10~20초 내** 튜토리얼 결과 생성(비동기 처리 가능)
- 생성 지연 시 UI에서 “생성중”을 명확히 표시

---

## 8) 데이터 모델(논리 모델) — 최소
### 8.1 Entities
- Project
  - id, title, status(uploaded/generating/ready/exported/failed), created_at
- Asset
  - id, project_id, type(image/audio/zip), s3_key, meta(width/height), created_at
- Step
  - id, project_id, step_no, title, instruction, highlight_json, tts_script, created_at

### 8.2 상태 머신(권장)
uploaded → generating → ready → exported  
(예외) generating → failed (fallback 제공)

---

## 9) SCORM 1.2 Export 요구사항(최소 구현)
### 9.1 Export 산출물
- ZIP 파일 내부에 최소 구성:
  - `imsmanifest.xml`
  - `index.html` (SCO 런처)
  - `assets/` (step 이미지 + 오디오)
  - `scorm_api.js` (SCORM API wrapper)

### 9.2 완료 트래킹(Completed) — MVP 필수
- 학습자가 마지막 step에서 “완료” 버튼을 누르면:
  - SCORM API 초기화 → 상태값 설정 → Commit → Finish
- 목표: SCORM Cloud에서 **Completed**로 표시되면 성공

> 점수/성공(passed/failed)은 MVP 제외

---

## 10) AWS 배포 요구사항(해커톤용)
### 10.1 필수
- 실제 URL로 접속 가능한 웹사이트
- 업로드/생성/플레이/Export 전 과정 작동

### 10.2 권장 구성(유연)
- Frontend: Next.js
- Backend: Node API (Express/Fastify 등)
- Storage: S3 (이미지/오디오/zip)
- DB: DynamoDB 또는 Postgres
- 비동기: SQS + worker(Lambda/ECS) (AI 생성/오디오 생성은 비동기 권장)

---

## 11) 데모/발표 안정장치(필수)
- AI 호출 실패/지연 시:
  - 즉시 “샘플 프로젝트(미리 생성된 결과)” 로드
- 발표 중 오류 방지:
  - 샘플 자산/결과를 로컬 또는 S3에 상시 준비
  - 네트워크 불안정 대비 캐시(가능하면)

---

## 12) 성공 기준(Acceptance Criteria) — 이것만 되면 MVP 합격
1) 스크린샷 5~7장 업로드 가능
2) AI 단계 생성 결과가 steps JSON으로 저장됨
3) 플레이어에서 step-by-step 정상 표시(하이라이트 포함)
4) SCORM zip 다운로드 가능
5) SCORM Cloud(또는 LMS)에서 실행되고 **Completed**가 찍힘
6) 발표 중 실패 시에도 샘플 프로젝트로 데모가 완주됨

---

## 13) 7일 개발 일정(고정 로드맵)
### Day 1 — 프로젝트 골격
- 업로드 화면/프로젝트 생성
- S3 업로드 파이프라인(프리사인드 URL 권장)
- DB 기본 테이블/컬렉션 구성

### Day 2 — 프로젝트 상태/에셋 관리
- 상태 머신 구현
- 업로드된 이미지 미리보기/정렬 UI
- 샘플 프로젝트(정적) 탑재

### Day 3 — AI Step Generator
- OpenAI Vision + Structured Outputs로 steps JSON 생성
- 실패/불확실 처리
- 결과 저장 및 플레이어 연동

### Day 4 — 튜토리얼 플레이어 완성
- 오버레이 하이라이트 렌더
- Next/Back/Progress
- (옵션) 간단 편집

### Day 5 — TTS(선택) + 안정화
- 단계별 TTS 생성/저장/재생(시간 남으면)
- 로딩/오류 UX 다듬기

### Day 6 — SCORM Exporter
- manifest + index.html + assets 패키징
- SCORM 완료 처리 구현
- SCORM Cloud 테스트

### Day 7 — 폴리싱 & 제출 패키지
- 랜딩(문제→해결→데모)
- 60초 데모 영상 시나리오/녹화
- 발표 스크립트 3분 버전
- 최종 버그픽스/샘플 프로젝트 안전장치 점검

---

## 14) 60초 데모 시나리오(고정)
1) 스크린샷 업로드 (10초)
2) Generate 클릭 → 단계 자동 생성 (15초)
3) 플레이어로 따라하기 (15초)
4) Export SCORM (10초)
5) SCORM Cloud에서 Completed 화면(또는 시연 캡처) (10초)

---

## 15) Codex 작업 지시(복붙용)
- “위 스펙을 준수하여 Next.js + Node 기반의 MVP 구현을 설계/코딩하라.”
- “Step JSON 스키마는 고정이며, AI 결과 저장/플레이/SCORM export가 일관되게 동작해야 한다.”
- “SCORM은 1.2 기준, 완료(Completed) 트래킹만 구현한다.”
- “발표 안정장치(샘플 프로젝트 fallback)를 반드시 포함한다.”

---

## 16) 추가 메모(스코프 보호)
- 본선 통과가 1차 목표이므로, 기능 확장보다 **완성도/안정성/데모 임팩트**를 우선한다.
- “교육툴” 포지셔닝을 흔드는 기능(세일즈 데모 최적화 등)은 MVP에서 금지한다.


---

## Additional Specification

One repo/workspace OK. Use Next.js App Router + Route Handlers (API routes) for MVP speed.

Local-first (filesystem assets + SQLite DB) to de-risk early dev; then switch to AWS for final demo (S3 + DynamoDB or Postgres). Must run on AWS by Day 6–7.

Use OPENAI_API_KEY via env; keep model configurable (no hardcode). Pick a vision+structured-output capable model as default.

Language default ko-KR only. Keep language field but no bilingual toggle in MVP.

Ship Must-Have only first (no step editor, no TTS). Iterate only if time remains.

IMPORTANT: You have access to the OpenAI API official docs MCP server. Please base all OpenAI API usage (Responses API, vision inputs, structured outputs, file handling, etc.) strictly on the official documentation from that MCP server and keep the implementation aligned with it. If any uncertainty arises, consult the MCP docs first rather than guessing.

+ 반드시 OpenAI API “공식문서 MCP”를 사용해서 구현해줘 (추측 금지, 공식문서 우선).

------------------------------------------------------------
Re: Next.js App Router + Route Handlers deployment on AWS (not static S3)

1) Deployment approach (recommended for hackathon speed)
- Use AWS Amplify Hosting for Next.js SSR + Route Handlers (API routes). This avoids building separate infra (ECS/ALB) and works for a “real working website” requirement.
- In prod on Amplify, DO NOT rely on local filesystem for assets. Store screenshots/scorm zip (and optional audio) in S3.

2) Alternative (only if Amplify is blocked)
- Containerize the Next.js app and deploy to ECS Fargate behind an ALB (CloudFront optional). More setup; only choose if necessary.

3) Cost expectation (short-term hackathon traffic)
- Amplify Hosting has a generous free tier: up to 1,000 build minutes/month; for typical demo traffic this is usually ~$0 (or a few dollars).
  Reference: Amplify pricing page mentions “No cost up to 1,000 build minutes per month”. https://aws.amazon.com/amplify/pricing/ :contentReference[oaicite:0]{index=0}
- S3 storage for small assets (few MB~few hundred MB) is negligible for a short period. https://aws.amazon.com/s3/pricing/
- DynamoDB on-demand usage for low traffic is also typically negligible. https://aws.amazon.com/dynamodb/pricing/on-demand/

4) Guardrail to avoid surprise costs
- After hackathon, delete the Amplify app and the S3 bucket objects (and DynamoDB table if used). That prevents any ongoing storage/hosting charges.

Implementation note:
- Keep “local-first (FS + SQLite)” for Days 1–5, but have an abstraction layer so switching to S3 (and DynamoDB/Postgres if needed) on Days 6–7 is straightforward.

------------------------------------------------------------
DB decision (DynamoDB-only for scalable demo)

We can go DynamoDB-only for all metadata/tutorial JSON/steps (for the hackathon “scalable demo”), BUT:
- Do NOT store binaries in DynamoDB (DynamoDB item size limit is 400 KB). Store binaries (screenshots/audio/scorm zip) in S3 and store only S3 keys + metadata in DynamoDB.
  Reference: AWS DynamoDB docs note max item size is 400KB and recommend storing large objects in S3 and keeping the identifier in DynamoDB. https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-use-s3-too.html :contentReference[oaicite:1]{index=1}

Suggested simple schema (avoid over-engineered single-table design for hackathon):
- Projects table:
  PK = projectId
  fields: title, status(uploaded/generating/ready/exported/failed), createdAt, updatedAt, tutorialTitle, language("ko-KR"), coverImageKey(optional), latestExportKey(optional)
- Steps table:
  PK = projectId
  SK = stepNo
  fields: title, instruction, highlight{x,y,w,h}, imageKey(S3), ttsKey(optional), notes(optional)

Access patterns:
- List projects
- Get project metadata by projectId
- Query Steps by projectId ordered by stepNo
- Export link derived from Projects.latestExportKey

Migration note:
- Start with SQLite locally (Days 1–5) but keep a repository/data-access layer so switching to DynamoDB + S3 in prod (Days 6–7) is straightforward.

