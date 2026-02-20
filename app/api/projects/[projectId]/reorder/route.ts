import { NextRequest, NextResponse } from "next/server";
import { getProject, reorderAssets } from "@/lib/repo";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();
  const assetIds = Array.isArray(body?.assetIds) ? body.assetIds.filter((v: unknown) => typeof v === "string") : [];

  if (!assetIds.length) {
    return NextResponse.json({ error: "assetIds is required" }, { status: 400 });
  }

  await reorderAssets(projectId, assetIds);
  return NextResponse.json(await getProjectView(projectId));
}
