import { NextResponse } from "next/server";
import { setProjectTitle } from "@/lib/repo";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const view = await getProjectView(projectId);
  if (!view) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(view);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const view = await getProjectView(projectId);
  if (!view) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await setProjectTitle(projectId, title);
  return NextResponse.json(await getProjectView(projectId));
}
