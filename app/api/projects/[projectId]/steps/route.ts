import { NextResponse } from "next/server";
import { getProject, saveEditedSteps, setProjectStatus } from "@/lib/repo";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function PUT(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const stepsRaw = Array.isArray(body?.steps) ? body.steps : null;
  if (!stepsRaw?.length) {
    return NextResponse.json({ error: "steps is required" }, { status: 400 });
  }

  const steps: Array<{
    id: string | null;
    stepNo: number;
    title: string;
    instruction: string;
    notes: string;
    ttsScript: string;
    assetId: string | null;
    highlight: { x: number; y: number; w: number; h: number };
  }> = stepsRaw.map((s: Record<string, unknown>, i: number) => ({
    id: typeof s.id === "string" && s.id ? s.id : null,
    stepNo: i + 1,
    title: typeof s.title === "string" ? s.title : "",
    instruction: typeof s.instruction === "string" ? s.instruction : "",
    notes: typeof s.notes === "string" ? s.notes : "",
    ttsScript: typeof s.ttsScript === "string" ? s.ttsScript : "",
    assetId: typeof s.assetId === "string" ? s.assetId : null,
    highlight: {
      x: Math.max(0, Math.round(toNumber(s?.highlight && (s.highlight as Record<string, unknown>).x))),
      y: Math.max(0, Math.round(toNumber(s?.highlight && (s.highlight as Record<string, unknown>).y))),
      w: Math.max(0, Math.round(toNumber(s?.highlight && (s.highlight as Record<string, unknown>).w))),
      h: Math.max(0, Math.round(toNumber(s?.highlight && (s.highlight as Record<string, unknown>).h)))
    }
  }));

  if (steps.some((s) => !s.title.trim() || !s.instruction.trim())) {
    return NextResponse.json({ error: "Each step requires title and instruction" }, { status: 400 });
  }

  await saveEditedSteps(projectId, steps);
  await setProjectStatus(projectId, "ready", null);
  return NextResponse.json(await getProjectView(projectId));
}
