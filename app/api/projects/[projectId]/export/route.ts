import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { buildScormZip } from "@/lib/scorm";
import { addAsset, getProject, listAssets, setProjectStatus } from "@/lib/repo";

export const runtime = "nodejs";

export async function POST(_: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!getProject(projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const zipPath = await buildScormZip(projectId);
  addAsset({
    projectId,
    kind: "zip",
    filePath: zipPath,
    mimeType: "application/zip",
    sortOrder: Date.now()
  });
  setProjectStatus(projectId, "exported");

  return NextResponse.json({
    ok: true,
    downloadUrl: `/api/projects/${projectId}/export?download=1`
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const zips = listAssets(projectId)
    .filter((a) => a.kind === "zip")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  if (!zips.length) {
    return NextResponse.json({ error: "No exported zip found" }, { status: 404 });
  }

  const latest = zips[0];
  const file = await fs.readFile(latest.filePath);
  const filename = path.basename(latest.filePath);

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
