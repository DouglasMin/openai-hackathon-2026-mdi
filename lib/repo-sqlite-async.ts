import * as syncRepo from "@/lib/repo-sqlite";
import type {
  AssetRecord,
  IssueCategory,
  IssueRecord,
  IssueSeverity,
  ProjectMode,
  ProjectRecord,
  ProjectStatus,
  ScanRunRecord,
  ScanStatus,
  ScormCloudRegistrationRecord,
  ScoreSummaryRecord,
  StepRecord,
  TutorialSchema
} from "@/lib/types";

export async function createProject(title: string, mode: ProjectMode = "authoring"): Promise<ProjectRecord> {
  return syncRepo.createProject(title, mode);
}
export async function listProjects(): Promise<ProjectRecord[]> {
  return syncRepo.listProjects();
}
export async function getProject(projectId: string): Promise<ProjectRecord | null> {
  return syncRepo.getProject(projectId);
}
export async function setProjectStatus(projectId: string, status: ProjectStatus, errorText: string | null = null): Promise<void> {
  syncRepo.setProjectStatus(projectId, status, errorText);
}
export async function setProjectMode(projectId: string, mode: ProjectMode): Promise<void> {
  syncRepo.setProjectMode(projectId, mode);
}
export async function setProjectTutorialTitle(projectId: string, tutorialTitle: string): Promise<void> {
  syncRepo.setProjectTutorialTitle(projectId, tutorialTitle);
}
export async function setProjectTitle(projectId: string, title: string): Promise<void> {
  syncRepo.setProjectTitle(projectId, title);
}
export async function addAsset(input: {
  projectId: string;
  kind: "image" | "audio" | "zip";
  filePath: string;
  mimeType: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  sortOrder: number;
}): Promise<AssetRecord> {
  return syncRepo.addAsset(input);
}
export async function listAssets(projectId: string): Promise<AssetRecord[]> {
  return syncRepo.listAssets(projectId);
}
export async function getAsset(assetId: string): Promise<AssetRecord | null> {
  return syncRepo.getAsset(assetId);
}
export async function reorderAssets(projectId: string, assetIds: string[]): Promise<void> {
  syncRepo.reorderAssets(projectId, assetIds);
}
export async function replaceSteps(projectId: string, tutorial: TutorialSchema, orderedAssets: AssetRecord[]): Promise<StepRecord[]> {
  return syncRepo.replaceSteps(projectId, tutorial, orderedAssets);
}
export async function setStepTtsAsset(projectId: string, stepNo: number, ttsAssetId: string): Promise<void> {
  syncRepo.setStepTtsAsset(projectId, stepNo, ttsAssetId);
}
export async function saveEditedSteps(
  projectId: string,
  steps: Array<{
    id?: string | null;
    stepNo: number;
    title: string;
    instruction: string;
    highlight: { x: number; y: number; w: number; h: number };
    notes?: string | null;
    ttsScript?: string | null;
    assetId: string | null;
  }>
): Promise<StepRecord[]> {
  return syncRepo.saveEditedSteps(projectId, steps);
}
export async function listSteps(projectId: string): Promise<StepRecord[]> {
  return syncRepo.listSteps(projectId);
}
export async function createScanRun(projectId: string, status: ScanStatus = "queued"): Promise<ScanRunRecord> {
  return syncRepo.createScanRun(projectId, status);
}
export async function updateScanRunStatus(scanRunId: string, status: ScanStatus, errorText: string | null = null): Promise<void> {
  syncRepo.updateScanRunStatus(scanRunId, status, errorText);
}
export async function getLatestScanRun(projectId: string): Promise<ScanRunRecord | null> {
  return syncRepo.getLatestScanRun(projectId);
}
export async function listScanRuns(projectId: string): Promise<ScanRunRecord[]> {
  return syncRepo.listScanRuns(projectId);
}
export async function getScanRun(scanRunId: string): Promise<ScanRunRecord | null> {
  return syncRepo.getScanRun(scanRunId);
}
export async function addIssue(input: {
  scanRunId: string;
  projectId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  ruleKey: string;
  title: string;
  detail: string;
  evidence?: string | null;
  filePath?: string | null;
  lineNo?: number | null;
  selector?: string | null;
  fixSuggestion?: string | null;
}): Promise<IssueRecord> {
  return syncRepo.addIssue(input);
}
export async function clearIssuesForRun(scanRunId: string): Promise<void> {
  syncRepo.clearIssuesForRun(scanRunId);
}
export async function listIssuesForRun(scanRunId: string): Promise<IssueRecord[]> {
  return syncRepo.listIssuesForRun(scanRunId);
}
export async function listIssuesFiltered(input: {
  projectId: string;
  scanRunId?: string | null;
  category?: IssueCategory | null;
  severity?: IssueSeverity | null;
  q?: string | null;
  limit?: number;
  offset?: number;
}): Promise<IssueRecord[]> {
  return syncRepo.listIssuesFiltered(input);
}
export async function countIssuesFiltered(input: {
  projectId: string;
  scanRunId?: string | null;
  category?: IssueCategory | null;
  severity?: IssueSeverity | null;
  q?: string | null;
}): Promise<number> {
  return syncRepo.countIssuesFiltered(input);
}
export async function upsertScoreSummary(input: Omit<ScoreSummaryRecord, "createdAt" | "updatedAt">): Promise<ScoreSummaryRecord> {
  return syncRepo.upsertScoreSummary(input);
}
export async function getScoreSummary(scanRunId: string): Promise<ScoreSummaryRecord | null> {
  return syncRepo.getScoreSummary(scanRunId);
}
export async function getScormCloudRegistration(projectId: string): Promise<ScormCloudRegistrationRecord | null> {
  return syncRepo.getScormCloudRegistration(projectId);
}
export async function upsertScormCloudRegistration(input: {
  projectId: string;
  courseId: string;
  registrationId: string;
  launchUrl: string | null;
  completed: boolean;
  completedSuccessfully: boolean;
  progressRaw: string | null;
  importedAt: string | null;
  syncedAt: string | null;
}): Promise<ScormCloudRegistrationRecord> {
  return syncRepo.upsertScormCloudRegistration(input);
}
export async function clearScormCloudRegistration(projectId: string): Promise<void> {
  syncRepo.clearScormCloudRegistration(projectId);
}
