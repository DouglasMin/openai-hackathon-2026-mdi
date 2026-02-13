import path from "node:path";
import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { generateTutorialFromAssets, synthesizeStepVoice } from "@/lib/openai";
import { getOrCreateSampleProject } from "@/lib/sample";
import { addAsset, getProject, listAssets, replaceSteps, setProjectStatus, setStepTtsAsset } from "@/lib/repo";
import { getProjectView } from "@/lib/view";
import { assetDir } from "@/lib/paths";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const assets = listAssets(projectId).filter((a) => a.kind === "image");
  if (!assets.length) {
    return NextResponse.json({ error: "No image assets to generate from" }, { status: 400 });
  }

  setProjectStatus(projectId, "generating");

  try {
    const tutorial = await generateTutorialFromAssets(assets);
    const steps = replaceSteps(projectId, tutorial, assets.map((a) => a.id));

    const withTts = process.env.ENABLE_TTS !== "false";
    let ttsGenerated = 0;

    if (withTts) {
      for (const step of steps) {
        try {
          const script = step.ttsScript?.trim() || step.instruction;
          const audio = await synthesizeStepVoice(script);
          const filePath = path.join(assetDir, `${projectId}-step-${step.stepNo}.mp3`);
          await fs.writeFile(filePath, audio);
          const asset = addAsset({
            projectId,
            kind: "audio",
            filePath,
            mimeType: "audio/mpeg",
            sortOrder: 10000 + step.stepNo
          });
          setStepTtsAsset(projectId, step.stepNo, asset.id);
          ttsGenerated += 1;
        } catch {
          // Keep tutorial usable even if some TTS generation fails.
        }
      }
    }

    setProjectStatus(projectId, "ready");
    return NextResponse.json({ ok: true, project: getProjectView(projectId), ttsGenerated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    setProjectStatus(projectId, "failed", message);

    const sampleProjectId = await getOrCreateSampleProject();
    return NextResponse.json(
      {
        ok: false,
        error: message,
        fallbackProjectId: sampleProjectId,
        fallbackProject: getProjectView(sampleProjectId)
      },
      { status: 200 }
    );
  }
}
