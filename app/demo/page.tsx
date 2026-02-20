"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useToast } from "@/app/components/toast";

type AssetView = { id: string; url: string; sortOrder: number; mimeType: string; kind: "image" | "audio" | "zip" };
type StepView = { id: string; stepNo: number; title: string; instruction: string; highlight: { x: number; y: number; w: number; h: number }; assetUrl: string | null };
type ScormCloudView = {
  projectId: string;
  courseId: string;
  registrationId: string;
  launchUrl: string | null;
  completed: boolean;
  completedSuccessfully: boolean;
  progressRaw: string | null;
  importedAt: string | null;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type ProjectView = {
  project: { id: string; title: string; status: string; tutorialTitle: string | null; errorText: string | null };
  assets: AssetView[];
  steps: StepView[];
  scormCloud: ScormCloudView | null;
};

export default function HomePage() {
  const [project, setProject] = useState<ProjectView | null>(null);
  const [title, setTitle] = useState("업무 프로세스 튜토리얼");
  const [busy, setBusy] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [scormSyncUiState, setScormSyncUiState] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [scormSyncPhase, setScormSyncPhase] = useState<number | null>(null);
  const { showToast, dismissToast } = useToast();

  const orderedAssets = useMemo(
    () => [...(project?.assets ?? [])].filter((a) => a.kind === "image").sort((a, b) => a.sortOrder - b.sortOrder),
    [project?.assets]
  );
  const statusMeta = useMemo(() => getStatusMeta(project?.project.status ?? "uploaded"), [project?.project.status]);
  const hasSteps = (project?.steps.length ?? 0) > 0;
  const canGenerate = orderedAssets.length > 0 && busy !== "generate";
  const canExport = project?.project.status === "ready" && busy !== "export";
  const canScormCloudSync = project?.project.status === "exported" && busy !== "scorm-cloud-sync";
  const canScormCloudRefresh = Boolean(project?.scormCloud) && busy !== "scorm-cloud-refresh";

  const create = useCallback(async () => {
    setBusy("create");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "업무 프로세스 튜토리얼" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.project) {
        showToast({ tone: "error", message: data?.error ?? "프로젝트 생성 실패" });
        return;
      }
      setProject(data.project);
      setTitle(data?.project?.project?.title ?? "업무 프로세스 튜토리얼");
    } catch {
      showToast({ tone: "error", message: "프로젝트 생성 실패" });
    } finally {
      setBusy(null);
    }
  }, [showToast]);

  useEffect(() => {
    void create();
  }, [create]);

  async function refresh(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
    const data = await res.json();
    setProject(data);
  }

  async function upload(files: FileList | null) {
    if (!project || !files?.length) return;
    setBusy("upload");
    const loadingId = showToast({ tone: "loading", message: "스크린샷 업로드 중..." });
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    try {
      const res = await fetch(`/api/projects/${project.project.id}/assets`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.project) {
        showToast({ tone: "error", message: data?.error ?? "업로드 실패" });
        return;
      }
      setProject(data);
      showToast({ tone: "success", message: "업로드 완료" });
    } catch {
      showToast({ tone: "error", message: "업로드 실패" });
    } finally {
      dismissToast(loadingId);
      setBusy(null);
    }
  }

  async function reorder(assetIds: string[]) {
    if (!project) return;
    const res = await fetch(`/api/projects/${project.project.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds })
    });
    const data = await res.json();
    setProject(data);
  }

  async function syncProjectTitle(): Promise<boolean> {
    if (!project) return false;
    const nextTitle = title.trim();
    if (!nextTitle) {
      showToast({ tone: "error", message: "프로젝트 제목을 입력해주세요." });
      return false;
    }
    if (nextTitle === project.project.title) {
      return true;
    }

    try {
      const res = await fetch(`/api/projects/${project.project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast({ tone: "error", message: data.error ?? "제목 저장 실패" });
        return false;
      }
      setProject(data);
      return true;
    } catch {
      showToast({ tone: "error", message: "제목 저장 실패" });
      return false;
    }
  }

  async function generate() {
    if (!project) return;
    const titleSynced = await syncProjectTitle();
    if (!titleSynced) return;
    setBusy("generate");
    const loadingId = showToast({ tone: "loading", message: "AI 단계 생성 중..." });
    try {
      const res = await fetch(`/api/projects/${project.project.id}/generate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast({ tone: "error", message: data?.error ?? "AI 생성 실패" });
        return;
      }

      if (data.ok) {
        setProject(data.project);
        showToast({ tone: "success", message: "AI 생성 완료" });
        return;
      }

      const reason = typeof data.error === "string" ? data.error : "Unknown generation error";
      showToast({ tone: "error", message: `AI failed (${reason})` });
      setProject(data.fallbackProject);
    } catch {
      showToast({ tone: "error", message: "AI 생성 실패" });
    } finally {
      dismissToast(loadingId);
      setBusy(null);
    }
  }

  async function exportScorm() {
    if (!project) return;
    setScormSyncUiState("idle");
    setScormSyncPhase(null);
    setBusy("export");
    const loadingId = showToast({ tone: "loading", message: "SCORM 내보내기 중..." });
    try {
      const res = await fetch(`/api/projects/${project.project.id}/export`, { method: "POST" });
      const data = await res.json();
      if (data.downloadUrl) {
        window.location.href = data.downloadUrl;
        await refresh(project.project.id);
        showToast({ tone: "success", message: "SCORM zip 생성 완료" });
      } else {
        showToast({ tone: "error", message: "SCORM 내보내기 실패" });
      }
    } catch {
      showToast({ tone: "error", message: "SCORM 내보내기 실패" });
    } finally {
      dismissToast(loadingId);
      setBusy(null);
    }
  }

  async function syncScormCloud() {
    if (!project) return;
    setScormSyncUiState("syncing");
    setScormSyncPhase(0);
    setBusy("scorm-cloud-sync");
    const loadingId = showToast({ tone: "loading", message: "SCORM Cloud 업로드/등록 중..." });
    const phaseTimer = window.setInterval(() => {
      setScormSyncPhase((prev) => {
        if (prev === null) return 0;
        return Math.min(prev + 1, 2);
      });
    }, 2400);
    try {
      const res = await fetch(`/api/projects/${project.project.id}/scorm-cloud`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setScormSyncUiState("error");
        showToast({ tone: "error", message: data.error ?? "SCORM Cloud 연동 실패" });
        return;
      }
      setProject(data.project);
      if (typeof data.launchUrl === "string" && data.launchUrl) {
        setScormSyncUiState("success");
        setScormSyncPhase(3);
        const opened = window.open(data.launchUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          showToast({ tone: "error", message: "브라우저가 새 탭 열기를 차단했습니다. 아래 'SCORM Cloud 실행 열기'를 눌러주세요." });
        }
      } else {
        setScormSyncUiState("error");
        showToast({ tone: "error", message: "런치 URL 생성 실패" });
        return;
      }
      showToast({ tone: "success", message: "SCORM Cloud 연동 완료. 새 탭에서 학습 화면을 열었습니다." });
    } catch {
      setScormSyncUiState("error");
      showToast({ tone: "error", message: "SCORM Cloud 연동 실패" });
    } finally {
      window.clearInterval(phaseTimer);
      dismissToast(loadingId);
      setBusy(null);
    }
  }

  async function refreshScormCloudStatus() {
    if (!project?.scormCloud) return;
    setBusy("scorm-cloud-refresh");
    const loadingId = showToast({ tone: "loading", message: "SCORM Cloud 완료 상태 확인 중..." });
    try {
      const res = await fetch(`/api/projects/${project.project.id}/scorm-cloud?refresh=1`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        showToast({ tone: "error", message: data.error ?? "SCORM Cloud 상태 확인 실패" });
        return;
      }
      await refresh(project.project.id);
      showToast({ tone: "success", message: data.scormCloud?.completed ? "완료 상태 확인됨" : "아직 완료 전 상태" });
    } catch {
      showToast({ tone: "error", message: "SCORM Cloud 상태 확인 실패" });
    } finally {
      dismissToast(loadingId);
      setBusy(null);
    }
  }

  if (!project) {
    return <main className="container">불러오는 중...</main>;
  }

  return (
    <main className="container app-shell">
      <header className="hero">
        <div>
          <div className="brand-row">
            <span className="brand-mark" />
            <span className="brand-text">FlowTutor Pro</span>
          </div>
          <h1>FlowTutor MVP</h1>
          <p className="small">스크린샷 업로드 → AI 단계 생성 → 플레이어 확인 → SCORM 1.2 내보내기</p>
        </div>
        <div className={`status-pill ${statusMeta.tone}`}>{statusMeta.label}</div>
      </header>

      <section className="card grid" style={{ gap: 14 }}>
        <div className="flow-grid">
          <div className="flow-step">
            <span className="flow-num">1</span>
            <strong>업로드</strong>
            <span className="small">{orderedAssets.length}장 업로드됨</span>
          </div>
          <div className="flow-step">
            <span className="flow-num">2</span>
            <strong>생성</strong>
            <span className="small">{hasSteps ? `${project.steps.length} step 생성` : "아직 생성 전"}</span>
          </div>
          <div className="flow-step">
            <span className="flow-num">3</span>
            <strong>내보내기</strong>
            <span className="small">{project.project.status === "exported" ? "내보내기 완료" : "준비 중"}</span>
          </div>
        </div>
        <label>
          <div className="small">프로젝트 제목</div>
          <div className="row">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="btn ghost" type="button" onClick={() => void syncProjectTitle()} disabled={!project || busy === "generate"}>
              제목 저장
            </button>
          </div>
        </label>
        <div className="row">
          <input type="file" accept="image/*,.zip,application/zip" multiple onChange={(e) => void upload(e.target.files)} disabled={busy === "upload"} />
          <button className="btn primary" onClick={() => void generate()} disabled={!canGenerate}>
            AI 단계 생성
          </button>
          <button className="btn ghost" onClick={() => void exportScorm()} disabled={!canExport}>
            SCORM 내보내기(zip)
          </button>
          <a className="btn ghost" href={`/demo/projects/${project.project.id}/qa`}>
            QA 점검판
          </a>
          <a className="btn ghost" href={`/demo/projects/${project.project.id}/edit`}>
            편집기
          </a>
          <a className="btn ghost" href={`/demo/projects/${project.project.id}/player`}>
            플레이어
          </a>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => void syncScormCloud()} disabled={!canScormCloudSync}>
            {busy === "scorm-cloud-sync" ? "SCORM Cloud 연동 중..." : "SCORM Cloud 업로드+런치"}
          </button>
          <button className="btn ghost" onClick={() => void refreshScormCloudStatus()} disabled={!canScormCloudRefresh}>
            {busy === "scorm-cloud-refresh" ? "완료 상태 동기화 중..." : "SCORM Cloud 완료 상태 동기화"}
          </button>
          {project.scormCloud?.launchUrl && (
            <a className="btn ghost" href={project.scormCloud.launchUrl} target="_blank" rel="noopener noreferrer">
              SCORM Cloud 실행 열기
            </a>
          )}
        </div>
        <div className="inline-alert neutral">
          <strong>SCORM Cloud 연동 순서</strong>
          <div className="small">1) SCORM 내보내기(zip) → 2) SCORM Cloud 업로드+런치 → 3) SCORM Cloud 실행 열기 → 4) 완료 상태 동기화</div>
          {project.project.status !== "exported" && <div className="small">현재 단계에서는 먼저 SCORM 내보내기를 완료해야 합니다.</div>}
          {busy === "scorm-cloud-sync" && <div className="small">진행 중: {getScormSyncPhaseLabel(scormSyncPhase)}</div>}
          {scormSyncUiState === "success" && <div className="small">연동 완료: 실행 열기 버튼으로 코스를 시작하세요.</div>}
          {scormSyncUiState === "error" && <div className="small">연동 실패: 토스트 에러 메시지를 확인하고 다시 시도하세요.</div>}
        </div>
        {project.scormCloud && (
          <div className="inline-alert neutral">
            SCORM Cloud 상태: {project.scormCloud.completed ? "Completed" : "In Progress"} / Registration: {project.scormCloud.registrationId} / 마지막 동기화:{" "}
            {formatTime(project.scormCloud.syncedAt)}
          </div>
        )}
        {project.project.errorText && <div className="inline-alert danger">AI 실패: {project.project.errorText}</div>}
      </section>

      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>업로드된 스크린샷</h3>
          <span className="small">이미지 또는 zip(내부 이미지 자동 추출) 업로드 가능. 드래그 순서가 step 순서가 됩니다.</span>
        </div>
        <div className="grid cols-2">
          {orderedAssets.map((asset, idx) => (
            <DraggableAsset
              key={asset.id}
              asset={asset}
              index={idx}
              assets={orderedAssets}
              onReorder={reorder}
              onPreview={(url) => {
                setPreviewUrl(url);
                setPreviewZoom(1);
              }}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <h3>생성된 단계</h3>
        {!project.steps.length && <p className="small">아직 생성된 단계가 없습니다.</p>}
        {project.steps.map((step) => (
          <div key={step.id} className="step-item">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>
                {step.stepNo}. {step.title}
              </strong>
              <span className="small mono">
                x:{step.highlight.x} y:{step.highlight.y} w:{step.highlight.w} h:{step.highlight.h}
              </span>
            </div>
            <div>{step.instruction}</div>
          </div>
        ))}
      </section>

      {previewUrl && (
        <div className="modal-backdrop" onClick={() => setPreviewUrl(null)} role="presentation">
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Image preview">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <strong>이미지 미리보기</strong>
              <div className="row">
                <button className="btn ghost" onClick={() => setPreviewZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}>
                  -
                </button>
                <span className="small">{Math.round(previewZoom * 100)}%</span>
                <button className="btn ghost" onClick={() => setPreviewZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}>
                  +
                </button>
                <button className="btn ghost" onClick={() => setPreviewZoom(1)}>
                  초기화
                </button>
                <button className="btn warn" onClick={() => setPreviewUrl(null)}>
                  닫기
                </button>
              </div>
            </div>
            <div className="modal-image-wrap">
              <Image className="modal-image" src={previewUrl} alt="preview" width={1920} height={1200} unoptimized style={{ transform: `scale(${previewZoom})` }} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function DraggableAsset({
  asset,
  index,
  assets,
  onReorder,
  onPreview
}: {
  asset: AssetView;
  index: number;
  assets: AssetView[];
  onReorder: (assetIds: string[]) => Promise<void>;
  onPreview: (url: string) => void;
}) {
  return (
    <div
      className="card asset-card"
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", asset.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const fromId = e.dataTransfer.getData("text/plain");
        const list = assets.map((a) => a.id);
        const from = list.indexOf(fromId);
        if (from < 0) return;
        list.splice(from, 1);
        list.splice(index, 0, fromId);
        void onReorder(list);
      }}
    >
      <Image className="thumb" src={asset.url} alt="asset" width={900} height={520} unoptimized onClick={() => onPreview(asset.url)} style={{ cursor: "zoom-in" }} />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="small">#{index + 1}</span>
        <span className="small">클릭해 확대</span>
      </div>
    </div>
  );
}

function formatTime(input: string | null): string {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleString("ko-KR");
}

function getScormSyncPhaseLabel(phase: number | null): string {
  if (phase === null || phase <= 0) return "1/3 패키지 업로드 요청";
  if (phase === 1) return "2/3 코스 import 처리";
  if (phase === 2) return "3/3 registration/launch 링크 생성";
  return "완료";
}

function getStatusMeta(status: string): { label: string; tone: "neutral" | "warn" | "ok" | "danger" } {
  if (status === "uploaded") return { label: "업로드 완료", tone: "neutral" };
  if (status === "generating") return { label: "생성 중", tone: "warn" };
  if (status === "ready") return { label: "생성 완료", tone: "ok" };
  if (status === "exported") return { label: "SCORM 내보냄", tone: "ok" };
  if (status === "failed") return { label: "실패", tone: "danger" };
  return { label: status, tone: "neutral" };
}
