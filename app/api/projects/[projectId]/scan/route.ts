import { NextResponse } from "next/server";
import {
  getScanRun,
  getLatestScanRun,
  getProject,
  getScoreSummary,
  listIssuesForRun,
  updateScanRunStatus
} from "@/lib/repo";
import { computeQualityScore } from "@/lib/qaScore";
import { executeProjectScan } from "@/lib/qaScanRunner";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const reqUrl = new URL(req.url);
  const scanRunId = reqUrl.searchParams.get("scanRunId");
  const scanRun = scanRunId ? await getScanRun(scanRunId) : await getLatestScanRun(projectId);
  if (!scanRun) {
    return NextResponse.json({ scanRun: null, issues: [], score: null });
  }
  if (scanRun.projectId !== projectId) {
    return NextResponse.json({ error: "Scan run does not belong to this project" }, { status: 400 });
  }

  const issues = await listIssuesForRun(scanRun.id);
  const scoreMeta = computeQualityScore(issues.map((i) => ({ category: i.category, severity: i.severity })));

  return NextResponse.json({
    scanRun,
    issues,
    score: await getScoreSummary(scanRun.id),
    scoreMeta: {
      categoryStats: scoreMeta.categoryStats,
      weights: scoreMeta.weights,
      penalties: scoreMeta.penalties
    }
  });
}

export async function POST(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const result = await executeProjectScan(projectId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown scan error";
    const latest = await getLatestScanRun(projectId);
    if (latest && (latest.status === "queued" || latest.status === "running")) {
      await updateScanRunStatus(latest.id, "failed", message);
    }
    return NextResponse.json(
      {
        ok: false,
        error: message
      },
      { status: 500 }
    );
  }
}
