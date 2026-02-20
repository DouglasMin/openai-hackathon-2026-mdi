import { NextResponse } from "next/server";
import { getProject } from "@/lib/repo";
import { executeProjectScan } from "@/lib/qaScanRunner";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const result = await executeProjectScan(projectId);
    return NextResponse.json({ ok: true, ...result, rescan: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown rescan error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
