import { NextResponse } from "next/server";
import { getProject } from "@/lib/repo";
import { generateVpatDraft, readVpatDraft } from "@/lib/vpat";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const result = await generateVpatDraft(projectId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "VPAT generation failed" }, { status: 400 });
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
    const vpat = await readVpatDraft(projectId, file);
    return new NextResponse(new Uint8Array(vpat.data), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${vpat.fileName}"`
      }
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "VPAT file not found" }, { status: 404 });
  }
}
