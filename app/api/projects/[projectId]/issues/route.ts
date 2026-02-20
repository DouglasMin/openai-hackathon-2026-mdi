import { NextResponse } from "next/server";
import { countIssuesFiltered, getProject, listIssuesFiltered } from "@/lib/repo";
import type { IssueCategory, IssueSeverity } from "@/lib/types";

export const runtime = "nodejs";

const categories = new Set<IssueCategory>(["accessibility", "scorm", "reliability"]);
const severities = new Set<IssueSeverity>(["critical", "high", "medium", "low"]);

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const scanRunId = url.searchParams.get("scanRunId");
  const categoryRaw = url.searchParams.get("category");
  const severityRaw = url.searchParams.get("severity");
  const q = url.searchParams.get("q");
  const limitRaw = Number(url.searchParams.get("limit") ?? 50);
  const offsetRaw = Number(url.searchParams.get("offset") ?? 0);

  const category = categoryRaw && categories.has(categoryRaw as IssueCategory) ? (categoryRaw as IssueCategory) : null;
  const severity = severityRaw && severities.has(severityRaw as IssueSeverity) ? (severityRaw as IssueSeverity) : null;
  const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
  const offset = Number.isFinite(offsetRaw) ? offsetRaw : 0;

  const filters = { projectId, scanRunId, category, severity, q, limit, offset };
  const issues = await listIssuesFiltered(filters);
  const total = await countIssuesFiltered({ projectId, scanRunId, category, severity, q });

  return NextResponse.json({
    issues,
    total,
    limit: Math.max(1, Math.min(200, limit)),
    offset: Math.max(0, offset),
    filters: {
      scanRunId,
      category,
      severity,
      q: q ?? ""
    }
  });
}
