import { NextResponse } from "next/server";
import { getProject, getScoreSummary, listScanRuns } from "@/lib/repo";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  if (!(await getProject(projectId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const runs = await listScanRuns(projectId);
  const runsWithScore = await Promise.all(runs.map(async (run) => ({
    ...run,
    score: await getScoreSummary(run.id)
  })));
  return NextResponse.json({ runs: runsWithScore, total: runsWithScore.length });
}
