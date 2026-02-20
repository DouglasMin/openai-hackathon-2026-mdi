오케이. **스피치/발표 코치 말고**, 2일 안에 **“시장성+독창성+완성도”**를 같이 잡아 **본선 통과 확률을 높이는** 걸로 바꿉니다.

---

## 우리가 만들 것 (한 줄)

### **CourseLint AI (또는 CourseGuard)**

**SCORM/HTML/PDF로 만든 교육 콘텐츠를 업로드하면, “접근성(WCAG/508) + SCORM 규격 + 내용 신뢰(환각/근거)”를 자동 점검하고, 바로 수정 패치까지 만들어주는 “eLearning QA 린터” SaaS**

---

# 1) 왜 이게 지금 먹히나 (최신 생성형 AI 트렌드 반영)

* **AI TRiSM(신뢰/리스크/보안) 트렌드**: 기업은 “AI로 만들긴 하는데, 사고(법무/컴플라이언스/허위정보)가 더 무섭다”로 넘어왔음. AI TRiSM은 이런 신뢰·리스크 관리를 강조하는 프레임워크로 계속 언급됩니다. ([Transcend][1])
* **Agentic + Structured Outputs**: 점검 결과는 UI에서 바로 써야 해서 “그럴듯한 글”이 아니라 **스키마(JSON)로 안정적으로** 뽑아야 합니다. OpenAI Structured Outputs로 JSON Schema 준수 출력 가능. ([OpenAI 개발자센터][2])
* **RAG(File search) 기반 근거 점검/정리**: 업로드한 코스/정책 문서 기준으로 “근거 링크/문장”까지 찾아서 리포팅(심사위원 설득력↑). File search는 Responses API의 도구로 공식 지원. ([OpenAI 개발자센터][3])

요약: “생성”이 아니라 **검증/거버넌스/QA**가 요즘 트렌드고, 해커톤에서도 신선합니다.

---

# 2) 비즈니스 가치 (시장성/사업성 10점 설계)

## 누가 돈을 내나

* **eLearning 제작 대행사 / L&D 팀**: 납품 전 QA가 지옥(브라우저/기기/접근성/표준).
* **LMS 벤더/콘텐츠 벤더**: 공공/대기업 납품하려면 접근성/표준 요구가 빡셈(특히 508/VPAT 관련). VPAT는 조달에서 자주 요구되는 표준 문서로 언급됩니다. ([Accessibility.Works][4])

## 왜 “필수 지출”이 되나

* 접근성은 “좋으면 좋은 것”이 아니라, **ADA/Section 508/WCAG 준수**가 요구되며 미준수는 리스크(법적/계약/브랜드)로 이어질 수 있다는 설명이 업계 자료에 반복됩니다. ([ispringsolutions.com][5])

## ROI가 명확함

* 기존에는

  * SCORM은 SCORM Cloud 같은 데서 돌려보며 테스트(동작/트래킹) ([rusticisoftware.com][6])
  * 접근성은 axe-core 같은 엔진/도구로 따로 검사 ([Deque][7])
  * 내용 품질/근거는 사람 눈으로 검수
* 우리는 이걸 **한 번에** 묶어서 “QA 시간/재작업”을 줄이는 메시지가 가능합니다.

---

# 2-1) 비슷한 SaaS/툴 리서치 (하지만 공백이 큼)

## (A) 접근성 검사 시장

* **axe-core / Deque**: 웹 접근성 테스트 엔진 및 도구 제품군. ([Deque][7])
* **W3C의 접근성 평가 도구 리스트**: 접근성 체크 툴이 매우 많다는 근거. ([w3.org][8])

✅ 공백: 접근성은 잘 잡지만, **SCORM 패키지 구조/트래킹/manifest**까지 “eLearning 문맥”으로 통합 점검하는 제품은 상대적으로 드뭄.

## (B) SCORM 테스트/검증 시장

* **SCORM Cloud(Rustici)**: 표준 기반 콘텐츠 테스트/실행/배포. ([rusticisoftware.com][6])
* **SCORM Debugger**: SCORM 트래킹/변수 모니터링 등 디버깅. ([SCORM Tools][9])
* “SCORM Validator”류 도구/가이드가 별도로 존재. ([doctorelearning.com][10])

✅ 공백: SCORM은 되는데, **WCAG/508 접근성 + AI 환각/근거 점검 + 자동 수정 패치**까지 한방에 안 됨.

## (C) LLM 환각/신뢰성 이슈

* LLM hallucination(환각)은 신뢰성 문제로 연구/검출/완화가 활발하다는 서베이들이 존재. ([ACM Digital Library][11])

✅ 공백: “학습 콘텐츠(규정/안전/의료 등)에서의 허위 정보 리스크를 자동 표시”는 아직 제품 공백이 큼.

---

# 3) 해커톤 MVP에서 “기발함”이 나오는 핵심 기능 5개

## 입력

* SCORM zip(또는 HTML zip / PDF) 업로드

## 출력(대시보드)

1. **총점 0~100** + 카테고리별 점수

   * SCORM 규격/런치 가능성
   * 접근성(WCAG 룰 기반)
   * 콘텐츠 신뢰(근거 없는 수치/주장 플래그)
2. **Top 10 이슈 리스트** (심각도/파일/줄/추천 수정)
3. **Fix 버튼** → 자동 수정 패치 생성(예: alt 텍스트/헤딩 구조/용어 통일/주의 문구)
4. **Patch 다운로드**: 수정된 zip 또는 “diff” 형태
5. **VPAT/접근성 요약 초안 생성**(심사위원에게 “사업성” 어필 강함)

---

# 4) 2일 개발 로드맵 (완성도 5점용)

## Day 1 — “업로드 → 분석 → 점수/리포트” 엔드투엔드 완성

**오전**

* 업로드(Zip/PDF) + 파일 저장
* Zip이면 unzip → `imsmanifest.xml` 존재 여부/구조 파싱(최소 체크)

**오후**

* (접근성) Playwright로 코스 HTML 렌더 → axe-core 실행 → 이슈 JSON 수집

  * axe-core는 자동 접근성 테스트 엔진으로 널리 쓰임. ([Deque][7])
* (LLM) OpenAI **Structured Outputs(JSON Schema)**로 리포트 스키마 고정. ([OpenAI 개발자센터][2])

**밤**

* 대시보드 UI: 점수 카드 + 이슈 테이블 + 파일별 필터
* 데모용 “문제 있는 샘플 SCORM/HTML” 준비

## Day 2 — “자동 수정(Fix) + 근거 점검 + VPAT 요약”으로 차별점 박기

**오전**

* Fix 엔진(룰 기반 + LLM 보조)

  * missing alt → alt 제안 생성
  * 헤딩 레벨 정리(H1/H2)
  * 용어/정책 문구 통일
* 수정 결과 “패치 zip” 재패키징

**오후**

* File search로 업로드된 정책/레퍼런스 문서에서 근거 찾아서

  * “근거 없는 수치/주장”에 **출처 필요 플래그**
  * File search는 Responses API 도구로 제공. ([OpenAI 개발자센터][3])
* VPAT/접근성 요약 초안 생성(한 페이지)

**마감**

* “Before/After 점수 상승” 데모 연출
* 90초 데모 스크립트 확정

---

# 5) 채점 기준(30점) 기준으로 “점수 나는 포지셔닝”

## 기획: 시장성/사업성 (10)

* 접근성/508/WCAG는 실제 조달/법무 이슈로 “필수” 영역. ([ispringsolutions.com][5])
* VPAT 같은 문서 수요 존재(특히 SaaS/LMS 납품). ([Accessibility.Works][4])
  → **8~10점 노림**

## 기획: 차별성/독창성 (5)

* 접근성 툴(axe) + SCORM 테스트(SCORM Cloud) + LLM 신뢰 점검(환각/근거) 통합은 흔치 않음. ([rusticisoftware.com][6])
  → **4~5점**

## 개발: 개발 완성도 (5)

* Day1에 엔드투엔드 완성 + Day2에 Fix/BeforeAfter까지 넣으면 심사에서 “완성”으로 보임
  → **4~5점**

## 개발: AI 활용도 (5)

* Structured Outputs로 리포트 스키마 강제 ([OpenAI 개발자센터][2])
* File search로 근거 기반 코멘트 ([OpenAI 개발자센터][3])
  → **5점**

## 디자인: UI/UX (3)

* “업로드 → 스캔 → 이슈 → Fix → 재스캔” 플로우가 직관적이라 점수 잘 나옴
  → **2~3점**

## 디자인: 심미성 (2)

* 다크모드/컴플라이언스 리포트 느낌 + 배지(Compliant / Needs Fix)로 깔끔하게
  → **2점 가능**

---

# 6) 심사에서 터지는 데모(이게 핵심)

1. 문제 있는 SCORM zip 업로드
2. **Score 62 / 접근성 40 / SCORM 85 / 신뢰 60** 같은 결과
3. “가장 치명적인 3개 이슈” 클릭하면 해당 파일/문장 하이라이트
4. **Fix 버튼** → 패치 zip 생성
5. 재스캔 → **Score 82로 상승**
6. “VPAT 요약 초안” 한 페이지 출력

이 흐름이면, 심사위원이 **시장성/기술/AI활용/완성도**를 동시에 이해합니다.

---

# 7) OpenAI API를 어디에 쓰는지(실제 구현 포인트)

* 리포트는 **Structured Outputs**로 JSON Schema 고정(프론트 안정성) ([OpenAI 개발자센터][2])
* 업로드된 코스/문서 기반 근거 검색은 **File search** ([OpenAI 개발자센터][3])
* “Fix 제안” 생성은 Responses API(도구 호출 구조로 묶기)

---

[1]: https://transcend.io/blog/ai-trism?utm_source=chatgpt.com "The Complete Guide to AI TRiSM"
[2]: https://developers.openai.com/api/docs/guides/structured-outputs/?utm_source=chatgpt.com "Structured model outputs | OpenAI API"
[3]: https://developers.openai.com/api/docs/guides/tools-file-search/?utm_source=chatgpt.com "File search | OpenAI API"
[4]: https://www.accessibility.works/blog/lms-wcag-hb21-1110-ada-eaa-compliance-schools-saas-guide/?utm_source=chatgpt.com "Schools & SaaS Providers: LMS: HB 21-1110, ADA & EAA ..."
[5]: https://www.ispringsolutions.com/blog/designing-accessible-elearning?utm_source=chatgpt.com "Accessible eLearning: Design Tips for Compliance and ..."
[6]: https://rusticisoftware.com/products/scorm-cloud/?utm_source=chatgpt.com "SCORM Cloud: Test, Play and Distribute eLearning"
[7]: https://www.deque.com/axe/axe-core/?utm_source=chatgpt.com "Axe-core by Deque | open source accessibility engine for ..."
[8]: https://www.w3.org/WAI/test-evaluate/tools/list/?utm_source=chatgpt.com "Web Accessibility Evaluation Tools List"
[9]: https://www.scormtools.net/scorm-debugger/?utm_source=chatgpt.com "SCORM Debugger - Online Elearning Content Testing & ..."
[10]: https://doctorelearning.com/blog/tools-for-testing-scorm/?utm_source=chatgpt.com "Top Tools for Testing SCORM: Creating Compliant Courses"
[11]: https://dl.acm.org/doi/10.1145/3703155?utm_source=chatgpt.com "A Survey on Hallucination in Large Language Models"
