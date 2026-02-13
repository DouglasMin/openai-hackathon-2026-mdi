import { NextResponse } from "next/server";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const view = getProjectView(projectId);
  if (!view) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(view);
}
