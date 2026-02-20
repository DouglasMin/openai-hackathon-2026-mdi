import Link from "next/link";

const productPillars = [
  { title: "Standardized Authoring", body: "업무 스크린샷을 일관된 학습 단계 포맷으로 자동 정규화합니다." },
  { title: "Operational Delivery", body: "SCORM 패키징부터 런치, 완료 추적 동기화까지 운영 흐름으로 연결합니다." },
  { title: "Governance & Evidence", body: "점수, 이슈, 자동수정 결과를 남겨 검수 책임과 변경 이력을 명확히 관리합니다." }
];

const featureCards = [
  "Vision step extraction + bbox(px)",
  "ko-KR instruction & TTS workflow",
  "SCORM Cloud completion sync",
  "Auto-fix + Re-scan delta score",
  "Editor with human override",
  "VPAT draft artifact export"
];

const scenarios = [
  "신규 직원 온보딩 표준화",
  "운영 프로세스 변경 공지 교육",
  "내부 시스템 전환 트레이닝",
  "LMS 납품 전 품질 게이트"
];

const workflowNodes = [
  { title: "스크린샷 업로드", desc: "업무 화면을 순서대로 업로드" },
  { title: "AI 단계 생성", desc: "step, bbox, 설명, TTS 자동 생성" },
  { title: "편집기 보정", desc: "필요한 항목만 사람이 수정" },
  { title: "SCORM 런치", desc: "패키지 export 후 Cloud 실행" },
  { title: "완료/QA 동기화", desc: "Completed 상태와 점검 결과 확인" }
];

export default function LandingPage() {
  return (
    <main className="landing-root">
      <div className="landing-shape shape-a" />
      <div className="landing-shape shape-b" />
      <div className="landing-shape shape-c" />

      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-mark" />
          <span>FlowTutor Pro</span>
        </div>
        <div className="landing-nav-right">
          <a href="#product">Product</a>
          <a href="#features">Features</a>
          <a href="#scenarios">Scenarios</a>
          <Link className="landing-btn ghost" href="/demo">
            Open Demo
          </Link>
        </div>
      </header>

      <section className="landing-hero-wrap">
        <div className="landing-hero" id="product">
          <p className="landing-kicker">ENTERPRISE WORKFLOW TRAINING PLATFORM</p>
          <h1>업무 지식을 LMS 운영 자산으로 전환하는 B2B 러닝 인프라.</h1>
          <p className="landing-subtitle">
            FlowTutor는 콘텐츠 생성, 배포, 완료 추적, QA 검증을 통합해 교육 운영팀이 반복 업무를 표준화하고 리스크를 줄이도록 설계되었습니다.
          </p>
          <div className="landing-cta-row">
            <Link className="landing-btn primary" href="/demo">
              Start Live Demo
            </Link>
            <a className="landing-btn ghost" href="#features">
              View Features
            </a>
          </div>
          <div className="landing-pill-row">
            <span>Structured Generation</span>
            <span>SCORM 1.2 Compliance</span>
            <span>Audit-Ready QA Artifacts</span>
          </div>
        </div>

        <aside className="landing-console">
          <div className="landing-console-top">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
            <strong>FlowTutor Live Pipeline</strong>
          </div>
          <div className="landing-console-body">
            <div className="line">1. Upload screenshots ... done</div>
            <div className="line">2. Generate tutorial JSON ... running</div>
            <div className="line">3. Build SCORM package ... queued</div>
            <div className="line">4. Sync completion status ... queued</div>
          </div>
          <div className="landing-console-cards">
            {productPillars.map((item) => (
              <article key={item.title} className="landing-mini-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="landing-feature-wall" id="features">
        <div className="landing-section-head">
          <h2>Enterprise-ready Capability Set</h2>
          <p>단순 데모 생성이 아니라, 운영 환경에서 요구되는 추적성과 검증성을 중심으로 구성했습니다.</p>
        </div>
        <div className="landing-feature-grid">
          {featureCards.map((item, idx) => (
            <div key={item} className="landing-feature-block">
              <span>{String(idx + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-workflow-diagram" id="workflow">
        <div className="landing-section-head">
          <h2>How It Works</h2>
          <p>방문자가 이해하기 쉬운 5단계 업무 흐름입니다.</p>
        </div>
        <div className="landing-node-rail">
          {workflowNodes.map((node, idx) => (
            <article key={node.title} className="landing-node-card">
              <span className="landing-node-index">{String(idx + 1).padStart(2, "0")}</span>
              <h3>{node.title}</h3>
              <p>{node.desc}</p>
              {idx < workflowNodes.length - 1 ? <span className="landing-node-link" aria-hidden="true" /> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-scenarios" id="scenarios">
        <div className="landing-section-head">
          <h2>Adopted Across Operational Training Flows</h2>
          <p>반복 교육과 규정 준수가 중요한 조직에서 즉시 적용 가능한 시나리오입니다.</p>
        </div>
        <div className="landing-chip-grid">
          {scenarios.map((item) => (
            <div key={item} className="landing-chip">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <h2>From operational screenshots to governed learning delivery.</h2>
          <p>/demo에서 업로드, 생성, 런치, 완료 동기화까지 실제 운영 흐름을 바로 검증할 수 있습니다.</p>
        </div>
        <div className="landing-cta-row">
          <Link className="landing-btn primary" href="/demo">
            Go to /demo
          </Link>
          <a className="landing-btn ghost" href="#product">
            Back to top
          </a>
        </div>
      </section>
    </main>
  );
}
