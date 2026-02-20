import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/repo";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ projects: await listProjects() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Untitled FlowTutor Project";
  const project = await createProject(title);
  return NextResponse.json({ project: await getProjectView(project.id) }, { status: 201 });
}
