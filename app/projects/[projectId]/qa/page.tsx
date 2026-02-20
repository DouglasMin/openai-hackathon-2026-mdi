"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/components/toast";

type ProjectView = {
  project: { id: string; title: string; tutorialTitle: string | null };
};

type ScanRun = {
  id: string;
  projectId: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt: string | null;
  finishedAt: string | null;
  errorText: string | null;
  createdAt: string;
  score?: Score | null;
};

type Score = {
  scanRunId: string;
  projectId: string;
  totalScore: number;
  accessibilityScore: number;
  scormScore: number;
  reliabilityScore: number;
};

type ScoreMeta = {
  categoryStats: Array<{
    category: "accessibility" | "scorm" | "reliability";
    issueCount: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    penalty: number;
  }>;
  weights: { accessibility: number; scorm: number; reliability: number };
  penalties: { critical: number; high: number; medium: number; low: number };
};

type Issue = {
  id: string;
  scanRunId: string;
  projectId: string;
  category: "accessibility" | "scorm" | "reliability";
  severity: "critical" | "high" | "medium" | "low";
  ruleKey: string;
  title: string;
  detail: string;
  evidence: string | null;
  filePath: string | null;
  lineNo: number | null;
  selector: string | null;
  fixSuggestion: string | null;
  createdAt: string;
};

type FixResult = {
  zipDownloadUrl: string;
  diffDownloadUrl: string;
  changedFiles: number;
  totalFixes: {
    imgAltAdded: number;
    buttonAriaLabelAdded: number;
    inputAriaLabelAdded: number;
    headingAdjusted: number;
  };
  fixedZipName: string;
  diffName: string;
};

type VpatResult = {
  fileName: string;
  downloadUrl: string;
};

export default function QADashboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { showToast, dismissToast } = useToast();
  const [projectId, setProjectId] = useState("");
  const [projectTitle, setProjectTitle] = useState("QA 점검판");
  const [runs, setRuns] = useState<ScanRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string>("");
  const [score, setScore] = useState<Score | null>(null);
  const [scoreMeta, setScoreMeta] = useState<ScoreMeta | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [totalIssues, setTotalIssues] = useState(0);
  const [busy, setBusy] = useState<"scan" | "rescan" | "fix" | "vpat" | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [vpatResult, setVpatResult] = useState<VpatResult | null>(null);
  const [filterCategory, setFilterCategory] = useState<"all" | "accessibility" | "scorm" | "reliability">("all");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "critical" | "high" | "medium" | "low">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void params.then((p) => setProjectId(p.projectId));
  }, [params]);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
    const data = (await res.json()) as ProjectView;
    setProjectTitle(data?.project?.tutorialTitle ?? data?.project?.title ?? "QA 점검판");
  }, [projectId]);

  const loadRuns = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}/scan-runs`, { cache: "no-store" });
    const data = (await res.json()) as { runs?: ScanRun[] };
    setRuns(data.runs ?? []);
  }, [projectId]);

  const loadScan = useCallback(async (runId?: string) => {
    if (!projectId) return;
    const suffix = runId ? `?scanRunId=${encodeURIComponent(runId)}` : "";
    const res = await fetch(`/api/projects/${projectId}/scan${suffix}`, { cache: "no-store" });
    const data = (await res.json()) as {
      scanRun: ScanRun | null;
      score: Score | null;
      scoreMeta: ScoreMeta | null;
    };

    if (data.scanRun) {
      setActiveRunId(data.scanRun.id);
      setScore(data.score);
      setScoreMeta(data.scoreMeta);
    } else {
      setActiveRunId("");
      setScore(null);
      setScoreMeta(null);
    }
  }, [projectId]);

  const loadIssues = useCallback(async () => {
    if (!projectId) return;
    const params = new URLSearchParams();
    if (activeRunId) params.set("scanRunId", activeRunId);
    if (filterCategory !== "all") params.set("category", filterCategory);
    if (filterSeverity !== "all") params.set("severity", filterSeverity);
    if (query.trim()) params.set("q", query.trim());
    params.set("limit", "10");
    params.set("offset", "0");

    const res = await fetch(`/api/projects/${projectId}/issues?${params.toString()}`, { cache: "no-store" });
    const data = (await res.json()) as { issues?: Issue[]; total?: number };
    setIssues(data.issues ?? []);
    setTotalIssues(data.total ?? 0);
  }, [activeRunId, filterCategory, filterSeverity, projectId, query]);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      await loadProject();
      await loadRuns();
      await loadScan();
    })();
  }, [loadProject, loadRuns, loadScan, projectId]);

  useEffect(() => {
    if (!projectId) return;
    void loadIssues();
  }, [loadIssues, projectId]);

  async function runScan(kind: "scan" | "rescan") {
    if (!projectId) return;
    setBusy(kind);
    const loadingId = showToast({ tone: "loading", message: kind === "scan" ? "스캔 실행 중..." : "재스캔 실행 중..." });

    try {
      const endpoint = kind === "scan" ? "scan" : "rescan";
      const res = await fetch(`/api/projects/${projectId}/${endpoint}`, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        scanRun?: ScanRun;
        issues?: Issue[];
        score?: Score;
        scoreMeta?: ScoreMeta;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error ?? `${kind} failed`);
      }
      if (data.scanRun) setActiveRunId(data.scanRun.id);
      if (data.score) setScore(data.score);
      if (data.scoreMeta) setScoreMeta(data.scoreMeta);
      if (data.issues) setIssues(data.issues);
      await loadRuns();
      await loadIssues();
      showToast({ tone: "success", message: kind === "scan" ? "스캔 완료" : "재스캔 완료" });
    } catch (e) {
      showToast({ tone: "error", message: e instanceof Error ? e.message : "스캔 실패" });
    } finally {
      dismissToast(loadingId);
      setBusy(null);
    }
  }

  async function runAutoFix() {
    if (!projectId) return;
    setBusy("fix");
    const loadingId = showToast({ tone: "loading", message: "자동 수정 패치 생성 중..." });
    try {
      const res = await fetch(`/api/projects/${projectId}/fix`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string } & Partial<FixResult>;
      if (!res.ok || data.ok === false) {
        throw new Error(data.error ?? "auto-fix failed");
      }
      setFixResult({
        zipDownloadUrl: data.zipDownloadUrl as string,
        diffDownloadUrl: data.diffDownloadUrl as string,
        changedFiles: data.changedFiles as number,
        totalFixes: data.totalFixes as FixResult["totalFixes"],
        fixedZipName: data.fixedZipName as string,
        diffName: data.diffName as string
      });
      showToast({ tone: "success", message: "패치 zip 생성 완료. 재점검으로 점수 비교하세요." });
    } catch (e) {
      showToast({ tone: "error", message: e instanceof Error ? e.message : "auto-fix failed" });
    } finally {
      dismissToast(loadingId);
      setBusy(null);
    }
  }

  async function runGenerateVpat() {
    if (!projectId) return;
    setBusy("vpat");
    const loadingId = showToast({ tone: "loading", message: "VPAT 초안 생성 중..." });
    try {
      const res = await fetch(`/api/projects/${projectId}/vpat`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string; fileName?: string; downloadUrl?: string };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error ?? "vpat generation failed");
      }
      setVpatResult({
        fileName: data.fileName as string,
        downloadUrl: data.downloadUrl as string
      });
      showToast({ tone: "success", message: "VPAT 초안 생성 완료" });
    } catch (e) {
      showToast({ tone: "error", message: e instanceof Error ? e.message : "vpat generation failed" });
    } finally {
      dismissToast(loadingId);
      setBusy(null);
    }
  }

  const scoreCards = useMemo(
    () => [
      { label: "총점", value: score?.totalScore ?? 0 },
      { label: "접근성", value: score?.accessibilityScore ?? 0 },
      { label: "SCORM", value: score?.scormScore ?? 0 },
      { label: "신뢰성", value: score?.reliabilityScore ?? 0 }
    ],
    [score]
  );

  const comparison = useMemo(() => {
    if (!activeRunId) return null;
    const currentRun = runs.find((r) => r.id === activeRunId) ?? null;
    const currentScore = score ?? currentRun?.score ?? null;
    if (!currentScore) return null;

    const previousRun =
      runs
        .filter((r) => r.id !== activeRunId && r.score)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null;
    if (!previousRun || !previousRun.score) return null;

    const prev = previousRun.score;
    const curr = currentScore;
    return {
      prevRunId: previousRun.id,
      current: curr,
      previous: prev,
      delta: {
        total: curr.totalScore - prev.totalScore,
        accessibility: curr.accessibilityScore - prev.accessibilityScore,
        scorm: curr.scormScore - prev.scormScore,
        reliability: curr.reliabilityScore - prev.reliabilityScore
      }
    };
  }, [activeRunId, runs, score]);

  return (
    <main className="container grid" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href="/demo">← 뒤로</Link>
        <div className="row">
          <Link className="btn ghost" href={`/demo/projects/${projectId}/player`}>
            플레이어
          </Link>
          <Link className="btn ghost" href={`/demo/projects/${projectId}/edit`}>
            편집기
          </Link>
          <button className="btn primary" onClick={() => void runScan("scan")} disabled={busy !== null}>
            점검 실행
          </button>
          <button className="btn ghost" onClick={() => void runScan("rescan")} disabled={busy !== null}>
            재점검
          </button>
          <button className="btn ghost" onClick={() => void runAutoFix()} disabled={busy !== null}>
            자동 수정
          </button>
          <button className="btn ghost" onClick={() => void runGenerateVpat()} disabled={busy !== null}>
            VPAT 초안 생성
          </button>
        </div>
      </div>

      <h1>{projectTitle} - QA 점검판</h1>

      <section className="card grid" style={{ gap: 8 }}>
        <h3>용어 설명</h3>
        <div className="small">
          `점검 실행`: 현재 zip/콘텐츠를 검사해서 이슈와 점수를 계산합니다. `재점검`: 수정 후 다시 검사해서 점수 변화를 확인합니다.
        </div>
        <div className="small">
          `자동 수정`: 기본 규칙(alt/aria-label/heading)으로 HTML을 자동 보정해 수정 zip과 diff를 만듭니다.
        </div>
        <div className="small">`VPAT 초안 생성`: 최신 점검 결과를 바탕으로 접근성 보고서 초안(.md)을 생성합니다.</div>
      </section>

      <section className="qa-score-grid">
        {scoreCards.map((card) => (
          <div key={card.label} className="card qa-score-card">
            <div className="small">{card.label}</div>
            <div className="qa-score-value">{card.value}</div>
          </div>
        ))}
      </section>

      <section className="card grid" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>수정 전/후</h3>
          <span className="small">이전 스캔 대비 점수 변화</span>
        </div>
        {!comparison && <div className="small">비교할 이전 스캔이 아직 없습니다. 점검을 2회 이상 실행하면 변화량이 표시됩니다.</div>}
        {comparison && (
          <div className="qa-delta-grid">
            <DeltaCard label="총점" delta={comparison.delta.total} before={comparison.previous.totalScore} after={comparison.current.totalScore} />
            <DeltaCard
              label="접근성"
              delta={comparison.delta.accessibility}
              before={comparison.previous.accessibilityScore}
              after={comparison.current.accessibilityScore}
            />
            <DeltaCard label="SCORM" delta={comparison.delta.scorm} before={comparison.previous.scormScore} after={comparison.current.scormScore} />
            <DeltaCard
              label="신뢰성"
              delta={comparison.delta.reliability}
              before={comparison.previous.reliabilityScore}
              after={comparison.current.reliabilityScore}
            />
          </div>
        )}
      </section>

      <section className="card grid" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>점검 조건</h3>
          <span className="small">필터 적용된 상위 10개 이슈 표시</span>
        </div>
        <div className="row">
          <label className="small">실행 이력</label>
          <select
            className="input"
            style={{ width: 280 }}
            value={activeRunId}
            onChange={(e) => {
              const v = e.target.value;
              setActiveRunId(v);
              void loadScan(v);
            }}
          >
            <option value="">최신</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.createdAt} ({r.status})
              </option>
            ))}
          </select>

          <select className="input" style={{ width: 180 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as typeof filterCategory)}>
            <option value="all">전체 카테고리</option>
            <option value="accessibility">접근성</option>
            <option value="scorm">SCORM</option>
            <option value="reliability">신뢰성</option>
          </select>

          <select className="input" style={{ width: 160 }} value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}>
            <option value="all">전체 심각도</option>
            <option value="critical">치명</option>
            <option value="high">높음</option>
            <option value="medium">중간</option>
            <option value="low">낮음</option>
          </select>

          <input className="input" style={{ minWidth: 220 }} placeholder="제목/룰/상세 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </section>

      <section className="card grid" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>수정 산출물</h3>
          <span className="small">룰 기반 자동수정 결과</span>
        </div>
        {!fixResult && <div className="small">아직 생성된 패치가 없습니다. Auto Fix를 실행하세요.</div>}
        {fixResult && (
          <>
            <div className="small">
              changed files: {fixResult.changedFiles}, alt: {fixResult.totalFixes.imgAltAdded}, button aria-label:{" "}
              {fixResult.totalFixes.buttonAriaLabelAdded}, input aria-label: {fixResult.totalFixes.inputAriaLabelAdded}, heading adjusted:{" "}
              {fixResult.totalFixes.headingAdjusted}
            </div>
            <div className="row">
              <a className="btn ghost" href={fixResult.zipDownloadUrl}>
                수정 ZIP 다운로드
              </a>
              <a className="btn ghost" href={fixResult.diffDownloadUrl}>
                diff 다운로드
              </a>
              <span className="small">{fixResult.fixedZipName}</span>
            </div>
          </>
        )}
      </section>

      <section className="card grid" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>VPAT 초안</h3>
          <span className="small">접근성 보고서 초안 (자동 생성)</span>
        </div>
        {!vpatResult && <div className="small">아직 생성된 VPAT 초안이 없습니다. VPAT 초안 생성을 실행하세요.</div>}
        {vpatResult && (
          <div className="row">
            <a className="btn ghost" href={vpatResult.downloadUrl}>
              VPAT 초안 다운로드
            </a>
            <span className="small">{vpatResult.fileName}</span>
          </div>
        )}
      </section>

      <section className="card grid" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>상위 이슈</h3>
          <span className="small">총 일치 이슈: {totalIssues}</span>
        </div>
        {!issues.length && <div className="small">현재 필터에서 이슈가 없습니다.</div>}
        {issues.map((issue) => (
          <div key={issue.id} className="qa-issue-item">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row">
                <span className={`qa-sev ${issue.severity}`}>{issue.severity}</span>
                <span className={`qa-cat ${issue.category}`}>{issue.category}</span>
                <strong>{issue.title}</strong>
              </div>
              <span className="small mono">{issue.ruleKey}</span>
            </div>
            <div>{issue.detail}</div>
            <div className="small">
              파일: {issue.filePath ?? "-"}
              {issue.lineNo ? `:${issue.lineNo}` : ""}
              {issue.selector ? ` | selector: ${issue.selector}` : ""}
            </div>
            {issue.evidence ? <div className="small">근거: {issue.evidence}</div> : null}
            {issue.fixSuggestion ? <div className="small">권장 수정: {issue.fixSuggestion}</div> : null}
          </div>
        ))}
      </section>

      <section className="card">
        <h3>점수 규칙(고정)</h3>
        <div className="small">
          가중치 - 접근성: {scoreMeta?.weights.accessibility ?? 0.4}, SCORM: {scoreMeta?.weights.scorm ?? 0.35}, 신뢰성:{" "}
          {scoreMeta?.weights.reliability ?? 0.25}
        </div>
        <div className="small">
          페널티 - 치명: {scoreMeta?.penalties.critical ?? 20}, 높음: {scoreMeta?.penalties.high ?? 12}, 중간:{" "}
          {scoreMeta?.penalties.medium ?? 6}, 낮음: {scoreMeta?.penalties.low ?? 3}
        </div>
      </section>
    </main>
  );
}

function DeltaCard({ label, delta, before, after }: { label: string; delta: number; before: number; after: number }) {
  const tone = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const sign = delta > 0 ? "+" : "";
  return (
    <div className="qa-delta-card">
      <div className="small">{label}</div>
      <div className={`qa-delta-value ${tone}`}>
        {sign}
        {delta}
      </div>
      <div className="small">
        {before}점 → {after}점
      </div>
    </div>
  );
}
