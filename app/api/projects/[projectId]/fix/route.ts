import { NextResponse } from "next/server";
import { getProject } from "@/lib/repo";
import { resolveFixArtifact, runAutoFix } from "@/lib/qaFix";
import { readStorageObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const result = await runAutoFix(projectId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Auto-fix failed" }, { status: 400 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  if (!url.searchParams.get("download")) {
    return NextResponse.json({ error: "download query is required" }, { status: 400 });
  }
  const file = url.searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "file query is required" }, { status: 400 });
  }

  try {
    const artifact = resolveFixArtifact(projectId, file);
    const data = await readStorageObject(artifact.path);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": artifact.contentType,
        "Content-Disposition": `attachment; filename="${artifact.fileName}"`
      }
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Artifact not found" }, { status: 404 });
  }
}
