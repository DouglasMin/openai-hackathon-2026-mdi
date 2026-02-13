"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useToast } from "@/app/components/toast";

type AssetView = { id: string; url: string; sortOrder: number; mimeType: string; kind: "image" | "audio" | "zip" };
type StepView = { id: string; stepNo: number; title: string; instruction: string; highlight: { x: number; y: number; w: number; h: number }; assetUrl: string | null };
type ProjectView = {
  project: { id: string; title: string; status: string; tutorialTitle: string | null; errorText: string | null };
  assets: AssetView[];
  steps: StepView[];
};

export default function HomePage() {
  const [project, setProject] = useState<ProjectView | null>(null);
  const [title, setTitle] = useState("CRM 리드 등록 튜토리얼");
  const [busy, setBusy] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const { showToast, dismissToast } = useToast();

  const orderedAssets = useMemo(
    () => [...(project?.assets ?? [])].filter((a) => a.kind === "image").sort((a, b) => a.sortOrder - b.sortOrder),
    [project?.assets]
  );
  const statusMeta = useMemo(() => getStatusMeta(project?.project.status ?? "uploaded"), [project?.project.status]);
  const hasSteps = (project?.steps.length ?? 0) > 0;
  const canGenerate = orderedAssets.length > 0 && busy !== "generate";
  const canExport = project?.project.status === "ready" && busy !== "export";

  const create = useCallback(async () => {
    setBusy("create");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    const data = await res.json();
    setProject(data.project);
    setBusy(null);
  }, [title]);

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
      const data = await res.json();
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

  async function generate() {
    if (!project) return;
    setBusy("generate");
    const loadingId = showToast({ tone: "loading", message: "AI 단계 생성 중..." });
    try {
      const res = await fetch(`/api/projects/${project.project.id}/generate`, { method: "POST" });
      const data = await res.json();

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

  if (!project) {
    return <main className="container">Loading...</main>;
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
            <strong>Upload</strong>
            <span className="small">{orderedAssets.length}장 업로드됨</span>
          </div>
          <div className="flow-step">
            <span className="flow-num">2</span>
            <strong>Generate</strong>
            <span className="small">{hasSteps ? `${project.steps.length} step 생성` : "아직 생성 전"}</span>
          </div>
          <div className="flow-step">
            <span className="flow-num">3</span>
            <strong>Export</strong>
            <span className="small">{project.project.status === "exported" ? "내보내기 완료" : "준비 중"}</span>
          </div>
        </div>
        <label>
          <div className="small">Project title</div>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="row">
          <input type="file" accept="image/*,.zip,application/zip" multiple onChange={(e) => void upload(e.target.files)} disabled={busy === "upload"} />
          <button className="btn primary" onClick={() => void generate()} disabled={!canGenerate}>
            Generate with AI
          </button>
          <button className="btn ghost" onClick={() => void exportScorm()} disabled={!canExport}>
            Export SCORM (zip)
          </button>
          <a className="btn ghost" href={`/projects/${project.project.id}/player`}>
            Open Player
          </a>
        </div>
        {project.project.errorText && <div className="inline-alert danger">AI 실패: {project.project.errorText}</div>}
      </section>

      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3>Uploaded Screenshots</h3>
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
        <h3>Generated Steps</h3>
        {!project.steps.length && <p className="small">No steps yet</p>}
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
              <strong>Image Preview</strong>
              <div className="row">
                <button className="btn ghost" onClick={() => setPreviewZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}>
                  -
                </button>
                <span className="small">{Math.round(previewZoom * 100)}%</span>
                <button className="btn ghost" onClick={() => setPreviewZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}>
                  +
                </button>
                <button className="btn ghost" onClick={() => setPreviewZoom(1)}>
                  Reset
                </button>
                <button className="btn warn" onClick={() => setPreviewUrl(null)}>
                  Close
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
        <span className="small">click to zoom</span>
      </div>
    </div>
  );
}

function getStatusMeta(status: string): { label: string; tone: "neutral" | "warn" | "ok" | "danger" } {
  if (status === "uploaded") return { label: "업로드 완료", tone: "neutral" };
  if (status === "generating") return { label: "생성 중", tone: "warn" };
  if (status === "ready") return { label: "생성 완료", tone: "ok" };
  if (status === "exported") return { label: "SCORM 내보냄", tone: "ok" };
  if (status === "failed") return { label: "실패", tone: "danger" };
  return { label: status, tone: "neutral" };
}
