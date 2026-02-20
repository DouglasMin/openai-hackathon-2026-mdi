"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/app/components/toast";

type AssetView = { id: string; url: string; sortOrder: number; kind: "image" | "audio" | "zip"; imageWidth: number | null; imageHeight: number | null };
type StepView = {
  id: string;
  stepNo: number;
  title: string;
  instruction: string;
  notes: string | null;
  ttsScript: string | null;
  highlight: { x: number; y: number; w: number; h: number };
  assetId: string | null;
  needsReview: boolean;
};
type ApiView = {
  project: { id: string; title: string; tutorialTitle: string | null };
  assets: AssetView[];
  steps: StepView[];
};

type DraftStep = Omit<StepView, "stepNo"> & { stepNo: number };

export default function StepEditorPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { showToast, dismissToast } = useToast();
  const [projectId, setProjectId] = useState("");
  const [data, setData] = useState<ApiView | null>(null);
  const [steps, setSteps] = useState<DraftStep[]>([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [imgRendered, setImgRendered] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; nowX: number; nowY: number } | null>(null);
  const imageWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void params.then((p) => setProjectId(p.projectId));
  }, [params]);

  useEffect(() => {
    if (!projectId) return;
    void fetch(`/api/projects/${projectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: ApiView) => {
        setData(d);
        setSteps(d.steps);
        setSelected(0);
      });
  }, [projectId]);

  const imageAssets = useMemo(() => (data?.assets ?? []).filter((a) => a.kind === "image"), [data?.assets]);
  const step = steps[selected] ?? null;
  const currentAsset = step?.assetId ? imageAssets.find((a) => a.id === step.assetId) ?? null : null;
  const natural = useMemo(
    () => ({ w: currentAsset?.imageWidth ?? imgRendered.w, h: currentAsset?.imageHeight ?? imgRendered.h }),
    [currentAsset?.imageHeight, currentAsset?.imageWidth, imgRendered.h, imgRendered.w]
  );

  if (!data || !step) {
    return <main className="container">편집기 불러오는 중...</main>;
  }

  const scaleX = imgRendered.w > 0 ? imgRendered.w / Math.max(1, natural.w) : 1;
  const scaleY = imgRendered.h > 0 ? imgRendered.h / Math.max(1, natural.h) : 1;
  const displayRect = {
    x: step.highlight.x * scaleX,
    y: step.highlight.y * scaleY,
    w: step.highlight.w * scaleX,
    h: step.highlight.h * scaleY
  };

  function setStepPatch(patch: Partial<DraftStep>) {
    setSteps((prev) => prev.map((s, i) => (i === selected ? { ...s, ...patch } : s)));
  }

  function reorder(from: number, to: number) {
    if (from === to || to < 0 || to >= steps.length) return;
    const next = [...steps];
    const [picked] = next.splice(from, 1);
    next.splice(to, 0, picked);
    setSteps(next.map((s, i) => ({ ...s, stepNo: i + 1 })));
    setSelected(to);
  }

  function duplicateSelected() {
    const base = steps[selected];
    const clone: DraftStep = {
      ...base,
      id: `tmp-${crypto.randomUUID()}`,
      stepNo: base.stepNo + 1,
      title: `${base.title} (복사본)`
    };
    const next = [...steps];
    next.splice(selected + 1, 0, clone);
    setSteps(next.map((s, i) => ({ ...s, stepNo: i + 1 })));
    setSelected(selected + 1);
  }

  function deleteSelected() {
    if (steps.length <= 1) {
      showToast({ tone: "error", message: "최소 1개 step은 필요합니다." });
      return;
    }
    const next = steps.filter((_, i) => i !== selected).map((s, i) => ({ ...s, stepNo: i + 1 }));
    setSteps(next);
    setSelected(Math.max(0, selected - 1));
  }

  async function save() {
    if (!projectId) return;
    setBusy(true);
    const loadingId = showToast({ tone: "loading", message: "스텝 저장 중..." });
    try {
      const res = await fetch(`/api/projects/${projectId}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: steps.map((s) => ({
            id: s.id.startsWith("tmp-") ? null : s.id,
            title: s.title,
            instruction: s.instruction,
            notes: s.notes ?? "",
            ttsScript: s.ttsScript ?? "",
            assetId: s.assetId,
            highlight: s.highlight
          }))
        })
      });
      const updated = (await res.json()) as ApiView;
      if (!res.ok) throw new Error((updated as unknown as { error?: string }).error ?? "save failed");
      setData(updated);
      setSteps(updated.steps);
      setSelected(Math.min(selected, Math.max(0, updated.steps.length - 1)));
      showToast({ tone: "success", message: "저장 완료" });
    } catch (e) {
      showToast({ tone: "error", message: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      dismissToast(loadingId);
      setBusy(false);
    }
  }

  function beginDraw(clientX: number, clientY: number) {
    const wrap = imageWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    setDrawing({ startX: x, startY: y, nowX: x, nowY: y });
  }

  function moveDraw(clientX: number, clientY: number) {
    const wrap = imageWrapRef.current;
    if (!wrap || !drawing) return;
    const rect = wrap.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
    setDrawing({ ...drawing, nowX: x, nowY: y });
  }

  function endDraw() {
    if (!drawing) return;
    const left = Math.min(drawing.startX, drawing.nowX);
    const top = Math.min(drawing.startY, drawing.nowY);
    const width = Math.abs(drawing.nowX - drawing.startX);
    const height = Math.abs(drawing.nowY - drawing.startY);
    setDrawing(null);
    setStepPatch({
      highlight: {
        x: Math.round(left / Math.max(scaleX, 0.0001)),
        y: Math.round(top / Math.max(scaleY, 0.0001)),
        w: Math.round(width / Math.max(scaleX, 0.0001)),
        h: Math.round(height / Math.max(scaleY, 0.0001))
      },
      needsReview: false
    });
  }

  const draftRect =
    drawing &&
    ({
      x: Math.min(drawing.startX, drawing.nowX),
      y: Math.min(drawing.startY, drawing.nowY),
      w: Math.abs(drawing.nowX - drawing.startX),
      h: Math.abs(drawing.nowY - drawing.startY)
    } as const);

  return (
    <main className="container grid" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href="/demo">← 뒤로</Link>
        <div className="row">
          <Link className="btn ghost" href={`/demo/projects/${projectId}/qa`}>
            QA
          </Link>
          <Link className="btn ghost" href={`/demo/projects/${projectId}/player`}>
            플레이어
          </Link>
          <button className="btn primary" onClick={() => void save()} disabled={busy}>
            단계 저장
          </button>
        </div>
      </div>
      <h1>{data.project.tutorialTitle ?? data.project.title} - 단계 편집기</h1>

      <section className="player-layout">
        <aside className="card step-nav">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3>단계</h3>
            <span className="small">{steps.length}개</span>
          </div>
          <div className="step-list">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`step-link${i === selected ? " active" : ""}`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  reorder(Number(e.dataTransfer.getData("text/plain")), i);
                }}
                onClick={() => setSelected(i)}
              >
                <span className="step-link-num">{i + 1}</span>
                <span className="step-link-title">{s.title}</span>
                <span className={`step-link-state ${s.needsReview ? "" : "visited"}`}>{s.needsReview ? "review" : "ok"}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="grid" style={{ gap: 12 }}>
          <div className="card grid" style={{ gap: 10 }}>
            <div className="row">
              <button className="btn ghost" onClick={() => reorder(selected, selected - 1)} disabled={selected === 0}>
                ↑
              </button>
              <button className="btn ghost" onClick={() => reorder(selected, selected + 1)} disabled={selected === steps.length - 1}>
                ↓
              </button>
              <button className="btn ghost" onClick={duplicateSelected}>
                복제
              </button>
              <button className="btn warn" onClick={deleteSelected}>
                삭제
              </button>
            </div>

            <label>
              <div className="small">제목</div>
              <input className="input" value={step.title} onChange={(e) => setStepPatch({ title: e.target.value })} />
            </label>
            <label>
              <div className="small">설명</div>
              <textarea className="input" rows={4} value={step.instruction} onChange={(e) => setStepPatch({ instruction: e.target.value })} />
            </label>
            <label>
              <div className="small">스크린샷</div>
              <select className="input" value={step.assetId ?? ""} onChange={(e) => setStepPatch({ assetId: e.target.value || null })}>
                <option value="">(선택 안됨)</option>
                {imageAssets.map((asset, i) => (
                  <option key={asset.id} value={asset.id}>
                    #{i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="card">
            <div
              ref={imageWrapRef}
              className="player-image-shell"
              onMouseDown={(e) => beginDraw(e.clientX, e.clientY)}
              onMouseMove={(e) => moveDraw(e.clientX, e.clientY)}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            >
              {currentAsset ? (
                <Image
                  src={currentAsset.url}
                  alt="step editor"
                  width={1920}
                  height={1200}
                  unoptimized
                  className="player-image"
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    setImgRendered({ w: el.clientWidth || 1, h: el.clientHeight || 1 });
                  }}
                />
              ) : null}
              <div
                className="editor-rect"
                style={{
                  left: displayRect.x,
                  top: displayRect.y,
                  width: displayRect.w,
                  height: displayRect.h
                }}
              />
              {draftRect ? (
                <div className="editor-rect draft" style={{ left: draftRect.x, top: draftRect.y, width: draftRect.w, height: draftRect.h }} />
              ) : null}
            </div>

            <div className="grid cols-2" style={{ marginTop: 10 }}>
              {(["x", "y", "w", "h"] as const).map((k) => (
                <label key={k}>
                  <div className="small">{k.toUpperCase()} (px)</div>
                  <input
                    className="input"
                    type="number"
                    value={step.highlight[k]}
                    onChange={(e) => setStepPatch({ highlight: { ...step.highlight, [k]: Math.max(0, Number(e.target.value) || 0) } })}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
