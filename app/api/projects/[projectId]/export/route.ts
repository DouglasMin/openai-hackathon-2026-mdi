import { NextRequest, NextResponse } from "next/server";
import { buildScormZip } from "@/lib/scorm";
import { addAsset, clearScormCloudRegistration, getProject, listAssets, setProjectStatus } from "@/lib/repo";
import { readStorageObject, storageFileName } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const zipLocator = await buildScormZip(projectId);
  await addAsset({
    projectId,
    kind: "zip",
    filePath: zipLocator,
    mimeType: "application/zip",
    sortOrder: Date.now()
  });
  await clearScormCloudRegistration(projectId);
  await setProjectStatus(projectId, "exported");

  return NextResponse.json({
    ok: true,
    downloadUrl: `/api/projects/${projectId}/export?download=1`
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const zips = (await listAssets(projectId))
    .filter((a) => a.kind === "zip")
    .filter((a) => !storageFileName(a.filePath).startsWith(`qa-fix-${projectId}-`))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  if (!zips.length) {
    return NextResponse.json({ error: "No exported zip found" }, { status: 404 });
  }

  const latest = zips[0];
  const file = await readStorageObject(latest.filePath);
  const filename = storageFileName(latest.filePath);

  if (!req.nextUrl.searchParams.get("download")) {
    return NextResponse.json({ downloadUrl: `/api/projects/${projectId}/export?download=1`, filename });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
