export type ProjectStatus = "uploaded" | "generating" | "ready" | "exported" | "failed";
export type ProjectMode = "authoring" | "qa";

export type Highlight = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type StepRecord = {
  id: string;
  projectId: string;
  stepNo: number;
  assetIndex: number | null;
  title: string;
  instruction: string;
  highlight: Highlight;
  imageWidth: number | null;
  imageHeight: number | null;
  bboxConfidence: number | null;
  needsReview: boolean;
  ttsScript: string | null;
  notes: string | null;
  assetId: string | null;
  ttsAssetId: string | null;
  createdAt: string;
};

export type AssetRecord = {
  id: string;
  projectId: string;
  kind: "image" | "audio" | "zip";
  filePath: string;
  mimeType: string;
  imageWidth: number | null;
  imageHeight: number | null;
  sortOrder: number;
  createdAt: string;
};

export type ProjectRecord = {
  id: string;
  title: string;
  status: ProjectStatus;
  mode: ProjectMode;
  language: "ko-KR";
  tutorialTitle: string | null;
  errorText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScormCloudRegistrationRecord = {
  projectId: string;
  courseId: string;
  registrationId: string;
  launchUrl: string | null;
  completed: boolean;
  completedSuccessfully: boolean;
  progressRaw: string | null;
  importedAt: string | null;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ScanStatus = "queued" | "running" | "completed" | "failed";
export type IssueSeverity = "critical" | "high" | "medium" | "low";
export type IssueCategory = "accessibility" | "scorm" | "reliability";

export type ScanRunRecord = {
  id: string;
  projectId: string;
  status: ScanStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorText: string | null;
  createdAt: string;
};

export type IssueRecord = {
  id: string;
  scanRunId: string;
  projectId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  ruleKey: string;
  title: string;
  detail: string;
  evidence: string | null;
  filePath: string | null;
  lineNo: number | null;
  selector: string | null;
  fixSuggestion: string | null;
  createdAt: string;
};

export type ScoreSummaryRecord = {
  scanRunId: string;
  projectId: string;
  totalScore: number;
  accessibilityScore: number;
  scormScore: number;
  reliabilityScore: number;
  createdAt: string;
  updatedAt: string;
};

export type ScoreBreakdown = {
  totalScore: number;
  accessibilityScore: number;
  scormScore: number;
  reliabilityScore: number;
};

export type ScoreCategoryStats = {
  category: IssueCategory;
  issueCount: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  penalty: number;
};

export type ScoreComputationResult = {
  scores: ScoreBreakdown;
  categoryStats: ScoreCategoryStats[];
  weights: { accessibility: number; scorm: number; reliability: number };
  penalties: { critical: number; high: number; medium: number; low: number };
};

export type StepSchema = {
  step_no: number;
  asset_index: number;
  title: string;
  instruction: string;
  highlight: Highlight;
  tts_script: string;
  notes: string;
};

export type TutorialSchema = {
  tutorial_title: string;
  language: "ko-KR";
  steps: StepSchema[];
};
