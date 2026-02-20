import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
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

const now = () => new Date().toISOString();

export function createProject(title: string, mode: ProjectMode = "authoring"): ProjectRecord {
  const row: ProjectRecord = {
    id: randomUUID(),
    title,
    status: "uploaded",
    mode,
    language: "ko-KR",
    tutorialTitle: null,
    errorText: null,
    createdAt: now(),
    updatedAt: now()
  };

  db.prepare(
    `INSERT INTO projects (id, title, status, project_mode, language, tutorial_title, error_text, created_at, updated_at)
     VALUES (@id, @title, @status, @mode, @language, @tutorialTitle, @errorText, @createdAt, @updatedAt)`
  ).run(row);

  return row;
}

export function listProjects(): ProjectRecord[] {
  return db
    .prepare(
      `SELECT id, title, status, language, tutorial_title as tutorialTitle, error_text as errorText, created_at as createdAt, updated_at as updatedAt
              , project_mode as mode
       FROM projects ORDER BY created_at DESC`
    )
    .all() as ProjectRecord[];
}

export function getProject(projectId: string): ProjectRecord | null {
  const row = db
    .prepare(
      `SELECT id, title, status, language, tutorial_title as tutorialTitle, error_text as errorText, created_at as createdAt, updated_at as updatedAt
              , project_mode as mode
       FROM projects WHERE id = ?`
    )
    .get(projectId) as ProjectRecord | undefined;
  return row ?? null;
}

export function setProjectStatus(projectId: string, status: ProjectStatus, errorText: string | null = null): void {
  db.prepare(`UPDATE projects SET status = ?, error_text = ?, updated_at = ? WHERE id = ?`).run(
    status,
    errorText,
    now(),
    projectId
  );
}

export function setProjectMode(projectId: string, mode: ProjectMode): void {
  db.prepare(`UPDATE projects SET project_mode = ?, updated_at = ? WHERE id = ?`).run(mode, now(), projectId);
}

export function setProjectTutorialTitle(projectId: string, tutorialTitle: string): void {
  db.prepare(`UPDATE projects SET tutorial_title = ?, updated_at = ? WHERE id = ?`).run(tutorialTitle, now(), projectId);
}

export function setProjectTitle(projectId: string, title: string): void {
  db.prepare(`UPDATE projects SET title = ?, updated_at = ? WHERE id = ?`).run(title, now(), projectId);
}

export function addAsset(input: {
  projectId: string;
  kind: "image" | "audio" | "zip";
  filePath: string;
  mimeType: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  sortOrder: number;
}): AssetRecord {
  const row: AssetRecord = {
    id: randomUUID(),
    projectId: input.projectId,
    kind: input.kind,
    filePath: input.filePath,
    mimeType: input.mimeType,
    imageWidth: input.imageWidth ?? null,
    imageHeight: input.imageHeight ?? null,
    sortOrder: input.sortOrder,
    createdAt: now()
  };

  db.prepare(
    `INSERT INTO assets (id, project_id, kind, file_path, mime_type, image_width, image_height, sort_order, created_at)
     VALUES (@id, @projectId, @kind, @filePath, @mimeType, @imageWidth, @imageHeight, @sortOrder, @createdAt)`
  ).run(row);

  return row;
}

export function listAssets(projectId: string): AssetRecord[] {
  return db
    .prepare(
      `SELECT id, project_id as projectId, kind, file_path as filePath, mime_type as mimeType, sort_order as sortOrder, created_at as createdAt
              , image_width as imageWidth, image_height as imageHeight
       FROM assets WHERE project_id = ? ORDER BY sort_order ASC`
    )
    .all(projectId) as AssetRecord[];
}

export function getAsset(assetId: string): AssetRecord | null {
  const row = db
    .prepare(
      `SELECT id, project_id as projectId, kind, file_path as filePath, mime_type as mimeType, sort_order as sortOrder, created_at as createdAt
              , image_width as imageWidth, image_height as imageHeight
       FROM assets WHERE id = ?`
    )
    .get(assetId) as AssetRecord | undefined;
  return row ?? null;
}

export function reorderAssets(projectId: string, assetIds: string[]): void {
  const tx = db.transaction(() => {
    assetIds.forEach((assetId, index) => {
      db.prepare(`UPDATE assets SET sort_order = ? WHERE id = ? AND project_id = ?`).run(index, assetId, projectId);
    });
  });
  tx();
}

export function replaceSteps(projectId: string, tutorial: TutorialSchema, orderedAssets: AssetRecord[]): StepRecord[] {
  const imageAssets = orderedAssets.filter((a) => a.kind === "image");

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM steps WHERE project_id = ?`).run(projectId);

    const insert = db.prepare(
      `INSERT INTO steps (
          id, project_id, step_no, asset_index, title, instruction, highlight_json,
          image_width, image_height, bbox_confidence, needs_review,
          tts_script, notes, asset_id, tts_asset_id, created_at
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    tutorial.steps.forEach((step, index) => {
      const fallbackIndex = Math.min(index, Math.max(0, imageAssets.length - 1));
      const assetIndex = Number.isInteger(step.asset_index) ? step.asset_index : fallbackIndex;
      const asset = imageAssets[assetIndex] ?? imageAssets[fallbackIndex] ?? null;
      const needsReview = step.highlight.w <= 0 || step.highlight.h <= 0 || !asset?.imageWidth || !asset?.imageHeight ? 1 : 0;
      insert.run(
        randomUUID(),
        projectId,
        step.step_no,
        assetIndex,
        step.title,
        step.instruction,
        JSON.stringify(step.highlight),
        asset?.imageWidth ?? null,
        asset?.imageHeight ?? null,
        null,
        needsReview,
        step.tts_script ?? null,
        step.notes ?? null,
        asset?.id ?? null,
        null,
        now()
      );
    });

    db.prepare(`UPDATE projects SET tutorial_title = ?, language = ?, updated_at = ? WHERE id = ?`).run(
      tutorial.tutorial_title,
      tutorial.language,
      now(),
      projectId
    );
  });

  tx();
  return listSteps(projectId);
}

export function setStepTtsAsset(projectId: string, stepNo: number, ttsAssetId: string): void {
  db.prepare(`UPDATE steps SET tts_asset_id = ? WHERE project_id = ? AND step_no = ?`).run(ttsAssetId, projectId, stepNo);
}

export function saveEditedSteps(
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
): StepRecord[] {
  const assets = listAssets(projectId);
  const imageAssets = assets.filter((a) => a.kind === "image");
  const imageAssetIndex = new Map(imageAssets.map((a, i) => [a.id, i]));
  const prevById = new Map(listSteps(projectId).map((s) => [s.id, s]));

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM steps WHERE project_id = ?`).run(projectId);

    const insert = db.prepare(
      `INSERT INTO steps (
        id, project_id, step_no, asset_index, title, instruction, highlight_json,
        image_width, image_height, bbox_confidence, needs_review, tts_script, notes,
        asset_id, tts_asset_id, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    steps
      .sort((a, b) => a.stepNo - b.stepNo)
      .forEach((step, i) => {
        const normalizedStepNo = i + 1;
        const previous = step.id ? prevById.get(step.id) : undefined;
        const chosenAsset = step.assetId ? imageAssets.find((a) => a.id === step.assetId) ?? null : null;
        const assetIndex = chosenAsset ? (imageAssetIndex.get(chosenAsset.id) ?? normalizedStepNo - 1) : normalizedStepNo - 1;
        const needsReview = step.highlight.w <= 0 || step.highlight.h <= 0 || !chosenAsset?.imageWidth || !chosenAsset?.imageHeight ? 1 : 0;

        insert.run(
          step.id && prevById.has(step.id) ? step.id : randomUUID(),
          projectId,
          normalizedStepNo,
          assetIndex,
          step.title.trim(),
          step.instruction.trim(),
          JSON.stringify(step.highlight),
          chosenAsset?.imageWidth ?? previous?.imageWidth ?? null,
          chosenAsset?.imageHeight ?? previous?.imageHeight ?? null,
          previous?.bboxConfidence ?? null,
          needsReview,
          step.ttsScript ?? previous?.ttsScript ?? null,
          step.notes ?? previous?.notes ?? "",
          chosenAsset?.id ?? null,
          previous?.ttsAssetId ?? null,
          now()
        );
      });
  });

  tx();
  return listSteps(projectId);
}

export function listSteps(projectId: string): StepRecord[] {
  const rows = db
    .prepare(
      `SELECT id, project_id as projectId, step_no as stepNo, title, instruction, highlight_json as highlightJson,
              asset_index as assetIndex, image_width as imageWidth, image_height as imageHeight,
              bbox_confidence as bboxConfidence, needs_review as needsReview,
              tts_script as ttsScript, notes, asset_id as assetId, tts_asset_id as ttsAssetId, created_at as createdAt
       FROM steps WHERE project_id = ? ORDER BY step_no ASC`
    )
    .all(projectId) as Array<{
      id: string;
      projectId: string;
      stepNo: number;
      title: string;
      instruction: string;
      highlightJson: string;
      assetIndex: number | null;
      imageWidth: number | null;
      imageHeight: number | null;
      bboxConfidence: number | null;
      needsReview: number;
      ttsScript: string | null;
      notes: string | null;
      assetId: string | null;
      ttsAssetId: string | null;
      createdAt: string;
    }>;

  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    stepNo: row.stepNo,
    assetIndex: row.assetIndex,
    title: row.title,
    instruction: row.instruction,
    highlight: JSON.parse(row.highlightJson),
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    bboxConfidence: row.bboxConfidence,
    needsReview: Boolean(row.needsReview),
    ttsScript: row.ttsScript,
    notes: row.notes,
    assetId: row.assetId,
    ttsAssetId: row.ttsAssetId,
    createdAt: row.createdAt
  }));
}

export function createScanRun(projectId: string, status: ScanStatus = "queued"): ScanRunRecord {
  const row: ScanRunRecord = {
    id: randomUUID(),
    projectId,
    status,
    startedAt: status === "running" ? now() : null,
    finishedAt: null,
    errorText: null,
    createdAt: now()
  };
  db.prepare(
    `INSERT INTO scan_runs (id, project_id, status, started_at, finished_at, error_text, created_at)
     VALUES (@id, @projectId, @status, @startedAt, @finishedAt, @errorText, @createdAt)`
  ).run(row);
  return row;
}

export function updateScanRunStatus(scanRunId: string, status: ScanStatus, errorText: string | null = null): void {
  const startedAt = status === "running" ? now() : null;
  const finishedAt = status === "completed" || status === "failed" ? now() : null;
  db.prepare(
    `UPDATE scan_runs
     SET status = ?,
         started_at = COALESCE(started_at, ?),
         finished_at = COALESCE(?, finished_at),
         error_text = ?
     WHERE id = ?`
  ).run(status, startedAt, finishedAt, errorText, scanRunId);
}

export function getLatestScanRun(projectId: string): ScanRunRecord | null {
  const row = db
    .prepare(
      `SELECT id, project_id as projectId, status, started_at as startedAt, finished_at as finishedAt, error_text as errorText, created_at as createdAt
       FROM scan_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(projectId) as ScanRunRecord | undefined;
  return row ?? null;
}

export function listScanRuns(projectId: string): ScanRunRecord[] {
  return db
    .prepare(
      `SELECT id, project_id as projectId, status, started_at as startedAt, finished_at as finishedAt, error_text as errorText, created_at as createdAt
       FROM scan_runs WHERE project_id = ? ORDER BY created_at DESC`
    )
    .all(projectId) as ScanRunRecord[];
}

export function getScanRun(scanRunId: string): ScanRunRecord | null {
  const row = db
    .prepare(
      `SELECT id, project_id as projectId, status, started_at as startedAt, finished_at as finishedAt, error_text as errorText, created_at as createdAt
       FROM scan_runs WHERE id = ?`
    )
    .get(scanRunId) as ScanRunRecord | undefined;
  return row ?? null;
}

export function addIssue(input: {
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
}): IssueRecord {
  const row: IssueRecord = {
    id: randomUUID(),
    scanRunId: input.scanRunId,
    projectId: input.projectId,
    category: input.category,
    severity: input.severity,
    ruleKey: input.ruleKey,
    title: input.title,
    detail: input.detail,
    evidence: input.evidence ?? null,
    filePath: input.filePath ?? null,
    lineNo: input.lineNo ?? null,
    selector: input.selector ?? null,
    fixSuggestion: input.fixSuggestion ?? null,
    createdAt: now()
  };
  db.prepare(
    `INSERT INTO issues (id, scan_run_id, project_id, category, severity, rule_key, title, detail, evidence, file_path, line_no, selector, fix_suggestion, created_at)
     VALUES (@id, @scanRunId, @projectId, @category, @severity, @ruleKey, @title, @detail, @evidence, @filePath, @lineNo, @selector, @fixSuggestion, @createdAt)`
  ).run(row);
  return row;
}

export function clearIssuesForRun(scanRunId: string): void {
  db.prepare(`DELETE FROM issues WHERE scan_run_id = ?`).run(scanRunId);
}

export function listIssuesForRun(scanRunId: string): IssueRecord[] {
  return db
    .prepare(
      `SELECT id, scan_run_id as scanRunId, project_id as projectId, category, severity, rule_key as ruleKey, title, detail,
              evidence, file_path as filePath, line_no as lineNo, selector, fix_suggestion as fixSuggestion, created_at as createdAt
       FROM issues WHERE scan_run_id = ? ORDER BY
         CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
         created_at ASC`
    )
    .all(scanRunId) as IssueRecord[];
}

export function listIssuesFiltered(input: {
  projectId: string;
  scanRunId?: string | null;
  category?: IssueCategory | null;
  severity?: IssueSeverity | null;
  q?: string | null;
  limit?: number;
  offset?: number;
}): IssueRecord[] {
  const where: string[] = ["project_id = ?"];
  const params: Array<string | number> = [input.projectId];

  if (input.scanRunId) {
    where.push("scan_run_id = ?");
    params.push(input.scanRunId);
  }
  if (input.category) {
    where.push("category = ?");
    params.push(input.category);
  }
  if (input.severity) {
    where.push("severity = ?");
    params.push(input.severity);
  }
  if (input.q && input.q.trim()) {
    where.push("(title LIKE ? OR detail LIKE ? OR rule_key LIKE ?)");
    const like = `%${input.q.trim()}%`;
    params.push(like, like, like);
  }

  const limit = Math.max(1, Math.min(200, input.limit ?? 50));
  const offset = Math.max(0, input.offset ?? 0);

  return db
    .prepare(
      `SELECT id, scan_run_id as scanRunId, project_id as projectId, category, severity, rule_key as ruleKey, title, detail,
              evidence, file_path as filePath, line_no as lineNo, selector, fix_suggestion as fixSuggestion, created_at as createdAt
       FROM issues
       WHERE ${where.join(" AND ")}
       ORDER BY
         CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
         created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as IssueRecord[];
}

export function countIssuesFiltered(input: {
  projectId: string;
  scanRunId?: string | null;
  category?: IssueCategory | null;
  severity?: IssueSeverity | null;
  q?: string | null;
}): number {
  const where: string[] = ["project_id = ?"];
  const params: Array<string | number> = [input.projectId];

  if (input.scanRunId) {
    where.push("scan_run_id = ?");
    params.push(input.scanRunId);
  }
  if (input.category) {
    where.push("category = ?");
    params.push(input.category);
  }
  if (input.severity) {
    where.push("severity = ?");
    params.push(input.severity);
  }
  if (input.q && input.q.trim()) {
    where.push("(title LIKE ? OR detail LIKE ? OR rule_key LIKE ?)");
    const like = `%${input.q.trim()}%`;
    params.push(like, like, like);
  }

  const row = db
    .prepare(`SELECT COUNT(1) as cnt FROM issues WHERE ${where.join(" AND ")}`)
    .get(...params) as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

export function upsertScoreSummary(input: Omit<ScoreSummaryRecord, "createdAt" | "updatedAt">): ScoreSummaryRecord {
  const found = db.prepare(`SELECT scan_run_id as scanRunId FROM score_summary WHERE scan_run_id = ?`).get(input.scanRunId) as
    | { scanRunId: string }
    | undefined;
  const createdAt = found ? now() : now();
  const updatedAt = now();
  db.prepare(
    `INSERT INTO score_summary (scan_run_id, project_id, total_score, accessibility_score, scorm_score, reliability_score, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(scan_run_id) DO UPDATE SET
       project_id=excluded.project_id,
       total_score=excluded.total_score,
       accessibility_score=excluded.accessibility_score,
       scorm_score=excluded.scorm_score,
       reliability_score=excluded.reliability_score,
       updated_at=excluded.updated_at`
  ).run(input.scanRunId, input.projectId, input.totalScore, input.accessibilityScore, input.scormScore, input.reliabilityScore, createdAt, updatedAt);

  return (
    db
      .prepare(
        `SELECT scan_run_id as scanRunId, project_id as projectId, total_score as totalScore, accessibility_score as accessibilityScore,
                scorm_score as scormScore, reliability_score as reliabilityScore, created_at as createdAt, updated_at as updatedAt
         FROM score_summary WHERE scan_run_id = ?`
      )
      .get(input.scanRunId) as ScoreSummaryRecord
  );
}

export function getScoreSummary(scanRunId: string): ScoreSummaryRecord | null {
  const row = db
    .prepare(
      `SELECT scan_run_id as scanRunId, project_id as projectId, total_score as totalScore, accessibility_score as accessibilityScore,
              scorm_score as scormScore, reliability_score as reliabilityScore, created_at as createdAt, updated_at as updatedAt
       FROM score_summary WHERE scan_run_id = ?`
    )
    .get(scanRunId) as ScoreSummaryRecord | undefined;
  return row ?? null;
}

export function getScormCloudRegistration(projectId: string): ScormCloudRegistrationRecord | null {
  const row = db
    .prepare(
      `SELECT project_id as projectId, course_id as courseId, registration_id as registrationId, launch_url as launchUrl,
              completed, completed_successfully as completedSuccessfully, progress_raw as progressRaw,
              imported_at as importedAt, synced_at as syncedAt, created_at as createdAt, updated_at as updatedAt
       FROM scorm_cloud_registrations
       WHERE project_id = ?`
    )
    .get(projectId) as
    | {
        projectId: string;
        courseId: string;
        registrationId: string;
        launchUrl: string | null;
        completed: number;
        completedSuccessfully: number;
        progressRaw: string | null;
        importedAt: string | null;
        syncedAt: string | null;
        createdAt: string;
        updatedAt: string;
      }
    | undefined;

  if (!row) return null;
  return {
    ...row,
    completed: Boolean(row.completed),
    completedSuccessfully: Boolean(row.completedSuccessfully)
  };
}

export function upsertScormCloudRegistration(input: {
  projectId: string;
  courseId: string;
  registrationId: string;
  launchUrl: string | null;
  completed: boolean;
  completedSuccessfully: boolean;
  progressRaw: string | null;
  importedAt: string | null;
  syncedAt: string | null;
}): ScormCloudRegistrationRecord {
  const createdAt = now();
  const updatedAt = now();

  db.prepare(
    `INSERT INTO scorm_cloud_registrations (
       project_id, course_id, registration_id, launch_url, completed, completed_successfully,
       progress_raw, imported_at, synced_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(project_id) DO UPDATE SET
       course_id=excluded.course_id,
       registration_id=excluded.registration_id,
       launch_url=excluded.launch_url,
       completed=excluded.completed,
       completed_successfully=excluded.completed_successfully,
       progress_raw=excluded.progress_raw,
       imported_at=excluded.imported_at,
       synced_at=excluded.synced_at,
       updated_at=excluded.updated_at`
  ).run(
    input.projectId,
    input.courseId,
    input.registrationId,
    input.launchUrl,
    input.completed ? 1 : 0,
    input.completedSuccessfully ? 1 : 0,
    input.progressRaw,
    input.importedAt,
    input.syncedAt,
    createdAt,
    updatedAt
  );

  return getScormCloudRegistration(input.projectId) as ScormCloudRegistrationRecord;
}

export function clearScormCloudRegistration(projectId: string): void {
  db.prepare(`DELETE FROM scorm_cloud_registrations WHERE project_id = ?`).run(projectId);
}
