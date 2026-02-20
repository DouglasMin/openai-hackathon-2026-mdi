import { NextRequest, NextResponse } from "next/server";
import { synthesizeStepVoice } from "@/lib/openai";
import { addAsset, getProject, listSteps, setStepTtsAsset } from "@/lib/repo";
import { writeStorageObject } from "@/lib/storage";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 2;
const MAX_LIMIT = 6;
const DEADLINE_MS = 25000;

function parseLimit(value: string | null): number {
  const n = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(n)));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (process.env.ENABLE_TTS === "false") {
    return NextResponse.json({ error: "TTS is disabled by ENABLE_TTS=false" }, { status: 400 });
  }

  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
  const allSteps = (await listSteps(projectId)).sort((a, b) => a.stepNo - b.stepNo);
  const missing = allSteps.filter((step) => !step.ttsAssetId && (step.ttsScript?.trim() || step.instruction?.trim()));
  const targets = missing.slice(0, limit);

  if (!targets.length) {
    return NextResponse.json({ ok: true, generated: 0, attempted: 0, remaining: 0, failures: [] });
  }

  const deadline = Date.now() + DEADLINE_MS;
  let generated = 0;
  const failures: Array<{ stepNo: number; error: string }> = [];

  for (const step of targets) {
    if (Date.now() > deadline) {
      failures.push({ stepNo: step.stepNo, error: "Time budget exceeded; retry this endpoint." });
      continue;
    }

    try {
      const script = step.ttsScript?.trim() || step.instruction;
      const audio = await synthesizeStepVoice(script);
      const filePath = await writeStorageObject({
        category: "assets",
        projectId,
        fileName: `${projectId}-step-${step.stepNo}.mp3`,
        body: audio,
        contentType: "audio/mpeg"
      });
      const asset = await addAsset({
        projectId,
        kind: "audio",
        filePath,
        mimeType: "audio/mpeg",
        sortOrder: 10000 + step.stepNo
      });
      await setStepTtsAsset(projectId, step.stepNo, asset.id);
      generated += 1;
    } catch (error) {
      failures.push({
        stepNo: step.stepNo,
        error: error instanceof Error ? error.message : "Unknown TTS error"
      });
    }
  }

  const refreshed = await listSteps(projectId);
  const remaining = refreshed.filter((step) => !step.ttsAssetId && (step.ttsScript?.trim() || step.instruction?.trim())).length;

  return NextResponse.json({
    ok: true,
    generated,
    attempted: targets.length,
    remaining,
    failures
  });
}
