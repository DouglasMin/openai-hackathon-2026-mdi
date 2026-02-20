"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type ApiView = {
  project: { id: string; title: string; tutorialTitle: string | null; status: string };
  steps: Array<{
    id: string;
    stepNo: number;
    title: string;
    instruction: string;
    highlight: { x: number; y: number; w: number; h: number };
    imageWidth: number | null;
    imageHeight: number | null;
    assetUrl: string | null;
    ttsUrl: string | null;
  }>;
};

export default function PlayerPage({ params }: { params: Promise<{ projectId: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<ApiView | null>(null);
  const [idx, setIdx] = useState(0);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [visited, setVisited] = useState<number[]>([]);

  useEffect(() => {
    void params.then((p) => setProjectId(p.projectId));
  }, [params]);

  useEffect(() => {
    if (!projectId) return;
    void fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => setData(d));
  }, [projectId]);

  useEffect(() => {
    setVisited((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
  }, [idx]);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (!data) return;
      if (e.key === "ArrowLeft") {
        setIdx((v) => Math.max(0, v - 1));
      }
      if (e.key === "ArrowRight") {
        setIdx((v) => Math.min(data.steps.length - 1, v + 1));
      }
      if (e.key === "Escape") {
        setPreviewOpen(false);
      }
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, [data]);

  const step = useMemo(() => data?.steps[idx] ?? null, [data?.steps, idx]);
  const renderWidth = step?.imageWidth ?? imgNatural?.w ?? 1200;
  const renderHeight = step?.imageHeight ?? imgNatural?.h ?? 800;
  const highlight = useMemo(() => {
    if (!step) return { x: 0, y: 0, w: 0, h: 0 };
    const raw = step.highlight;
    const looksLikePixels = raw.x > 100 || raw.y > 100 || raw.w > 100 || raw.h > 100;
    if (looksLikePixels && imgNatural && imgNatural.w > 0 && imgNatural.h > 0) {
      return {
        x: (raw.x / imgNatural.w) * 100,
        y: (raw.y / imgNatural.h) * 100,
        w: (raw.w / imgNatural.w) * 100,
        h: (raw.h / imgNatural.h) * 100
      };
    }
    return raw;
  }, [step, imgNatural]);

  if (!data || !step) {
    return <main className="container">플레이어 불러오는 중...</main>;
  }

  return (
    <main className="container grid" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href="/demo">← 뒤로</Link>
        <div className="row">
          <Link className="btn ghost" href={`/demo/projects/${projectId}/qa`}>
            QA
          </Link>
          <Link className="btn ghost" href={`/demo/projects/${projectId}/edit`}>
            편집기
          </Link>
          <span className="small">키보드: ← → 이동 / ESC 닫기</span>
        </div>
      </div>
      <div className="brand-row">
        <span className="brand-mark" />
        <span className="brand-text">FlowTutor Pro</span>
      </div>
      <h1>{data.project.tutorialTitle ?? data.project.title}</h1>
      <section className="player-layout">
        <aside className="card step-nav">
          <h3>단계</h3>
          <div className="step-list">
            {data.steps.map((s, stepIndex) => {
              const isActive = stepIndex === idx;
              const isVisited = visited.includes(stepIndex);
              return (
                <button
                  key={s.id}
                  className={`step-link${isActive ? " active" : ""}`}
                  onClick={() => setIdx(stepIndex)}
                  type="button"
                >
                  <span className="step-link-num">{s.stepNo}</span>
                  <span className="step-link-title">{s.title}</span>
                  <span className={`step-link-state ${isVisited ? "visited" : ""}`}>{isVisited ? "완료" : "신규"}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="grid" style={{ gap: 12 }}>
          <div className="card">
            <div className="player-image-shell" style={{ aspectRatio: `${renderWidth} / ${renderHeight}` }}>
              {step.assetUrl && (
                <Image
                  src={step.assetUrl}
                  alt="step"
                  className="player-image"
                  width={renderWidth}
                  height={renderHeight}
                  unoptimized
                  onClick={() => {
                    setPreviewOpen(true);
                    setPreviewZoom(1);
                  }}
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  left: `${Math.max(0, Math.min(100, highlight.x))}%`,
                  top: `${Math.max(0, Math.min(100, highlight.y))}%`,
                  width: `${Math.max(0, Math.min(100, highlight.w))}%`,
                  height: `${Math.max(0, Math.min(100, highlight.h))}%`,
                  border: "3px solid #f59e0b",
                  background: "rgba(245,158,11,0.2)"
                }}
              />
            </div>
            <div className="small">이미지를 클릭하면 확대해서 볼 수 있습니다.</div>
          </div>

          <div className="card">
            <h3>
              {step.stepNo}. {step.title}
            </h3>
            <p>{step.instruction}</p>
            {step.ttsUrl && (
              <audio controls preload="none" src={step.ttsUrl} style={{ width: "100%", marginBottom: 10 }}>
                Your browser does not support audio playback.
              </audio>
            )}
            <div className="row">
              <button className="btn ghost" onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0}>
                이전
              </button>
              <button
                className="btn primary"
                onClick={() => setIdx((v) => Math.min(data.steps.length - 1, v + 1))}
                disabled={idx === data.steps.length - 1}
              >
                다음
              </button>
              <span className="small">
                {idx + 1}/{data.steps.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {previewOpen && step.assetUrl && (
        <div className="modal-backdrop" onClick={() => setPreviewOpen(false)} role="presentation">
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Player image preview">
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <strong>단계 이미지 미리보기</strong>
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
                <button className="btn warn" onClick={() => setPreviewOpen(false)}>
                  닫기
                </button>
              </div>
            </div>
            <div className="modal-image-wrap">
              <Image
                className="modal-image"
                src={step.assetUrl}
                alt="preview"
                width={renderWidth}
                height={renderHeight}
                unoptimized
                style={{ transform: `scale(${previewZoom})` }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
