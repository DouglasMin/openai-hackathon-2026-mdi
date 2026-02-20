import {
  addIssue,
  clearIssuesForRun,
  createScanRun,
  listIssuesForRun,
  upsertScoreSummary,
  updateScanRunStatus
} from "@/lib/repo";
import { runQualityScan } from "@/lib/qaScan";

export async function executeProjectScan(projectId: string) {
  const scanRun = await createScanRun(projectId, "queued");
  await updateScanRunStatus(scanRun.id, "running");
  await clearIssuesForRun(scanRun.id);

  try {
    const result = await runQualityScan(projectId);
    for (const issue of result.issues) {
      await addIssue({
        scanRunId: scanRun.id,
        projectId,
        ...issue
      });
    }

    const score = await upsertScoreSummary({
      scanRunId: scanRun.id,
      projectId,
      ...result.scoreComputation.scores
    });
    await updateScanRunStatus(scanRun.id, "completed");

    return {
      scanRun: { ...scanRun, status: "completed" as const },
      issues: await listIssuesForRun(scanRun.id),
      score,
      scoreMeta: {
        categoryStats: result.scoreComputation.categoryStats,
        weights: result.scoreComputation.weights,
        penalties: result.scoreComputation.penalties
      }
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown scan execution error";
    await updateScanRunStatus(scanRun.id, "failed", message);
    throw e;
  }
}
