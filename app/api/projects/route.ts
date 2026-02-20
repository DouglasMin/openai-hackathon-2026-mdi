import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/repo";
import { isDynamoDbEnabled, isS3StorageEnabled } from "@/lib/runtimeConfig";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

function runtimeMeta() {
  return {
    dbBackend: isDynamoDbEnabled() ? "dynamodb" : "sqlite",
    storageBackend: isS3StorageEnabled() ? "s3" : "local"
  };
}

export async function GET() {
  try {
    return NextResponse.json({ projects: await listProjects(), runtime: runtimeMeta() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list projects";
    console.error("[/api/projects][GET] ", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "Untitled FlowTutor Project";
    const project = await createProject(title);
    return NextResponse.json({ project: await getProjectView(project.id), runtime: runtimeMeta() }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    console.error("[/api/projects][POST] ", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
