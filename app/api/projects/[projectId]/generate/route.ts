import { NextResponse } from "next/server";
import { generateTutorialFromAssets, synthesizeStepVoice } from "@/lib/openai";
import { getOrCreateSampleProject } from "@/lib/sample";
import { addAsset, getProject, listAssets, replaceSteps, setProjectStatus, setStepTtsAsset } from "@/lib/repo";
import { writeStorageObject } from "@/lib/storage";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const assets = (await listAssets(projectId)).filter((a) => a.kind === "image");
  if (!assets.length) {
    return NextResponse.json({ error: "No image assets to generate from" }, { status: 400 });
  }

  await setProjectStatus(projectId, "generating");

  try {
    const workflowName = project.tutorialTitle?.trim() || project.title || "업무 프로세스";
    const tutorial = await generateTutorialFromAssets(assets, workflowName);
    const steps = await replaceSteps(projectId, tutorial, assets);

    const withTts = process.env.ENABLE_TTS !== "false";
    let ttsGenerated = 0;

    if (withTts) {
      for (const step of steps) {
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
          ttsGenerated += 1;
        } catch {
          // Keep tutorial usable even if some TTS generation fails.
        }
      }
    }

    await setProjectStatus(projectId, "ready");
    return NextResponse.json({ ok: true, project: await getProjectView(projectId), ttsGenerated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error";
    await setProjectStatus(projectId, "failed", message);

    const sampleProjectId = await getOrCreateSampleProject();
    return NextResponse.json(
      {
        ok: false,
        error: message,
        fallbackProjectId: sampleProjectId,
        fallbackProject: await getProjectView(sampleProjectId)
      },
      { status: 200 }
    );
  }
}
