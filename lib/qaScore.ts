import type { IssueCategory, IssueSeverity, ScoreComputationResult } from "@/lib/types";

const CATEGORY_WEIGHTS = {
  accessibility: 0.4,
  scorm: 0.35,
  reliability: 0.25
} as const;

const SEVERITY_PENALTIES = {
  critical: 20,
  high: 12,
  medium: 6,
  low: 3
} as const;

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

type ScoreIssue = { category: IssueCategory; severity: IssueSeverity };

export function computeQualityScore(issues: ScoreIssue[]): ScoreComputationResult {
  const stats = (["accessibility", "scorm", "reliability"] as const).map((category) => {
    const categoryIssues = issues.filter((i) => i.category === category);
    const critical = categoryIssues.filter((i) => i.severity === "critical").length;
    const high = categoryIssues.filter((i) => i.severity === "high").length;
    const medium = categoryIssues.filter((i) => i.severity === "medium").length;
    const low = categoryIssues.filter((i) => i.severity === "low").length;
    const penalty =
      critical * SEVERITY_PENALTIES.critical +
      high * SEVERITY_PENALTIES.high +
      medium * SEVERITY_PENALTIES.medium +
      low * SEVERITY_PENALTIES.low;
    return {
      category,
      issueCount: categoryIssues.length,
      critical,
      high,
      medium,
      low,
      penalty
    };
  });

  const byCategory = new Map(stats.map((s) => [s.category, s]));
  const accessibilityScore = clampScore(100 - (byCategory.get("accessibility")?.penalty ?? 0));
  const scormScore = clampScore(100 - (byCategory.get("scorm")?.penalty ?? 0));
  const reliabilityScore = clampScore(100 - (byCategory.get("reliability")?.penalty ?? 0));

  const totalScore = clampScore(
    accessibilityScore * CATEGORY_WEIGHTS.accessibility +
      scormScore * CATEGORY_WEIGHTS.scorm +
      reliabilityScore * CATEGORY_WEIGHTS.reliability
  );

  return {
    scores: { totalScore, accessibilityScore, scormScore, reliabilityScore },
    categoryStats: stats,
    weights: CATEGORY_WEIGHTS,
    penalties: SEVERITY_PENALTIES
  };
}
