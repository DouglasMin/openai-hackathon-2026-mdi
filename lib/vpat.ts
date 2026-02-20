import path from "node:path";
import { getLatestScanRun, getProject, getScoreSummary, listIssuesForRun } from "@/lib/repo";
import { readStorageObject, storageLocatorByName, writeStorageObject } from "@/lib/storage";

type Conformance = "Supports" | "Partially Supports" | "Does Not Support";

function determineConformance(input: { critical: number; high: number; medium: number; low: number }): Conformance {
  if (input.critical > 0 || input.high >= 3) return "Does Not Support";
  if (input.high > 0 || input.medium > 0 || input.low > 0) return "Partially Supports";
  return "Supports";
}

function buildVpatMarkdown(input: {
  projectTitle: string;
  projectId: string;
  scanRunId: string;
  generatedAt: string;
  score: {
    total: number;
    accessibility: number;
    scorm: number;
    reliability: number;
  };
  accessibilityCounts: { critical: number; high: number; medium: number; low: number };
  topAccessibilityFindings: Array<{ title: string; severity: string; detail: string; filePath: string | null; fixSuggestion: string | null }>;
}): string {
  const conformanceA = determineConformance(input.accessibilityCounts);
  const conformanceAA = determineConformance({
    critical: input.accessibilityCounts.critical,
    high: input.accessibilityCounts.high,
    medium: input.accessibilityCounts.medium,
    low: 0
  });
  const conformance508 = determineConformance({
    critical: input.accessibilityCounts.critical,
    high: input.accessibilityCounts.high,
    medium: Math.ceil(input.accessibilityCounts.medium / 2),
    low: 0
  });

  const findings =
    input.topAccessibilityFindings.length === 0
      ? "- No accessibility findings detected in latest scan."
      : input.topAccessibilityFindings
          .map(
            (f, idx) =>
              `${idx + 1}. [${f.severity}] ${f.title}\n` +
              `   - File: ${f.filePath ?? "-"}\n` +
              `   - Detail: ${f.detail}\n` +
              `   - Suggested remediation: ${f.fixSuggestion ?? "Review manually"}`
          )
          .join("\n");

  return (
    `# VPAT Draft (Auto-generated)\n\n` +
    `> Draft notice: This is an automatically generated draft based on static QA scan results. Human review is required before external sharing.\n\n` +
    `## Product Information\n` +
    `- Product: ${input.projectTitle}\n` +
    `- Project ID: ${input.projectId}\n` +
    `- Source Scan Run ID: ${input.scanRunId}\n` +
    `- Generated At (UTC): ${input.generatedAt}\n` +
    `- Applicable Standards: WCAG 2.1 A/AA, Section 508 (draft mapping)\n\n` +
    `## Scan Score Snapshot\n` +
    `- Total score: ${input.score.total}\n` +
    `- Accessibility score: ${input.score.accessibility}\n` +
    `- SCORM score: ${input.score.scorm}\n` +
    `- Reliability score: ${input.score.reliability}\n\n` +
    `## Accessibility Issue Counts (Latest Scan)\n` +
    `- Critical: ${input.accessibilityCounts.critical}\n` +
    `- High: ${input.accessibilityCounts.high}\n` +
    `- Medium: ${input.accessibilityCounts.medium}\n` +
    `- Low: ${input.accessibilityCounts.low}\n\n` +
    `## Conformance Summary (Draft)\n` +
    `| Criteria | Conformance | Remarks |\n` +
    `|---|---|---|\n` +
    `| WCAG 2.1 Level A | ${conformanceA} | Derived from automated accessibility findings; verify manually for final report. |\n` +
    `| WCAG 2.1 Level AA | ${conformanceAA} | Medium/High/Critical findings influence this draft status. |\n` +
    `| Section 508 (Chapter 5, draft mapping) | ${conformance508} | Initial mapping from WCAG-oriented scan; legal review recommended. |\n\n` +
    `## Top Accessibility Findings\n` +
    `${findings}\n\n` +
    `## Assumptions and Limitations\n` +
    `- This draft relies on automated HTML scanning and heuristic scoring.\n` +
    `- It does not replace full manual audit, assistive technology testing, or legal review.\n` +
    `- Dynamic runtime behavior and context-specific accessibility requirements may not be fully covered.\n`
  );
}

export async function generateVpatDraft(projectId: string): Promise<{ fileName: string; downloadUrl: string }> {
  const project = await getProject(projectId);
  if (!project) {
    throw new Error("Project not found");
  }
  const scanRun = await getLatestScanRun(projectId);
  if (!scanRun) {
    throw new Error("No scan run found. Run QA scan first.");
  }
  const score = await getScoreSummary(scanRun.id);
  if (!score) {
    throw new Error("No score summary found for latest scan.");
  }

  const issues = await listIssuesForRun(scanRun.id);
  const accessibilityIssues = issues.filter((i) => i.category === "accessibility");
  const counts = {
    critical: accessibilityIssues.filter((i) => i.severity === "critical").length,
    high: accessibilityIssues.filter((i) => i.severity === "high").length,
    medium: accessibilityIssues.filter((i) => i.severity === "medium").length,
    low: accessibilityIssues.filter((i) => i.severity === "low").length
  };

  const content = buildVpatMarkdown({
    projectTitle: project.tutorialTitle ?? project.title,
    projectId,
    scanRunId: scanRun.id,
    generatedAt: new Date().toISOString(),
    score: {
      total: score.totalScore,
      accessibility: score.accessibilityScore,
      scorm: score.scormScore,
      reliability: score.reliabilityScore
    },
    accessibilityCounts: counts,
    topAccessibilityFindings: accessibilityIssues.slice(0, 8).map((i) => ({
      title: i.title,
      severity: i.severity,
      detail: i.detail,
      filePath: i.filePath,
      fixSuggestion: i.fixSuggestion
    }))
  });

  const fileName = `vpat-${projectId}-${Date.now()}.md`;
  await writeStorageObject({
    category: "vpat",
    projectId,
    fileName,
    body: content,
    contentType: "text/markdown; charset=utf-8"
  });

  return {
    fileName,
    downloadUrl: `/api/projects/${projectId}/vpat?download=1&file=${encodeURIComponent(fileName)}`
  };
}

export async function readVpatDraft(projectId: string, fileNameRaw: string): Promise<{ fileName: string; data: Buffer }> {
  const fileName = path.basename(fileNameRaw);
  if (!fileName.startsWith(`vpat-${projectId}-`) || !fileName.endsWith(".md")) {
    throw new Error("Invalid VPAT filename");
  }
  const fullPath = storageLocatorByName("vpat", projectId, fileName);
  const data = await readStorageObject(fullPath);
  return { fileName, data };
}
