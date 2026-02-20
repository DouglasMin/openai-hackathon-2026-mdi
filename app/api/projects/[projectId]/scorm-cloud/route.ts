import { NextResponse } from "next/server";
import {
  clearScormCloudRegistration,
  getProject,
  getScormCloudRegistration,
  listAssets,
  upsertScormCloudRegistration
} from "@/lib/repo";
import { createRegistrationLaunchFromZip, getRegistrationProgress, isScormCloudConfigured } from "@/lib/scormCloud";
import { storageFileName } from "@/lib/storage";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

async function latestExportZipPath(projectId: string): Promise<string | null> {
  const zips = (await listAssets(projectId))
    .filter((a) => a.kind === "zip")
    .filter((a) => !storageFileName(a.filePath).startsWith(`qa-fix-${projectId}-`))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return zips[0]?.filePath ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (!isScormCloudConfigured()) {
    return NextResponse.json({ error: "SCORM Cloud env is not configured" }, { status: 400 });
  }

  const zipPath = await latestExportZipPath(projectId);
  if (!zipPath) {
    return NextResponse.json({ error: "Export SCORM zip first" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const redirectOnExitUrl = `${origin}/demo/projects/${projectId}/qa`;

  try {
    const linked = await createRegistrationLaunchFromZip({
      projectId,
      zipPath,
      redirectOnExitUrl
    });

    const saved = await upsertScormCloudRegistration({
      projectId,
      courseId: linked.courseId,
      registrationId: linked.registrationId,
      launchUrl: linked.launchUrl,
      completed: false,
      completedSuccessfully: false,
      progressRaw: null,
      importedAt: linked.importedAt,
      syncedAt: linked.syncedAt
    });

    return NextResponse.json({
      ok: true,
      scormCloud: saved,
      launchUrl: linked.launchUrl,
      project: await getProjectView(projectId)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SCORM Cloud sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const configured = isScormCloudConfigured();
  const current = await getScormCloudRegistration(projectId);
  const shouldRefresh = new URL(req.url).searchParams.get("refresh") === "1";

  if (!current) {
    return NextResponse.json({ configured, scormCloud: null });
  }

  if (!shouldRefresh) {
    return NextResponse.json({ configured, scormCloud: current });
  }

  if (!configured) {
    return NextResponse.json({ error: "SCORM Cloud env is not configured", configured, scormCloud: current }, { status: 400 });
  }

  try {
    const progress = await getRegistrationProgress(current.registrationId);
    const updated = await upsertScormCloudRegistration({
      projectId,
      courseId: current.courseId,
      registrationId: current.registrationId,
      launchUrl: current.launchUrl,
      completed: progress.completed,
      completedSuccessfully: progress.completedSuccessfully,
      progressRaw: JSON.stringify(progress.raw),
      importedAt: current.importedAt,
      syncedAt: new Date().toISOString()
    });

    return NextResponse.json({ configured, scormCloud: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SCORM Cloud progress refresh failed";
    return NextResponse.json({ error: message, configured, scormCloud: current }, { status: 502 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  await clearScormCloudRegistration(projectId);
  return NextResponse.json({ ok: true });
}
