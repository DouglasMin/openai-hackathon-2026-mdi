import { NextResponse } from "next/server";
import { generateTutorialFromAssets } from "@/lib/openai";
import { getOrCreateSampleProject } from "@/lib/sample";
import { getProject, listAssets, replaceSteps, setProjectStatus } from "@/lib/repo";
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
    await replaceSteps(projectId, tutorial, assets);

    await setProjectStatus(projectId, "ready");
    return NextResponse.json({ ok: true, project: await getProjectView(projectId), ttsGenerated: 0 });
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
