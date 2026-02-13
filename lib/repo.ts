import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { AssetRecord, ProjectRecord, ProjectStatus, StepRecord, TutorialSchema } from "@/lib/types";

const now = () => new Date().toISOString();

export function createProject(title: string): ProjectRecord {
  const row: ProjectRecord = {
    id: randomUUID(),
    title,
    status: "uploaded",
    language: "ko-KR",
    tutorialTitle: null,
    errorText: null,
    createdAt: now(),
    updatedAt: now()
  };

  db.prepare(
    `INSERT INTO projects (id, title, status, language, tutorial_title, error_text, created_at, updated_at)
     VALUES (@id, @title, @status, @language, @tutorialTitle, @errorText, @createdAt, @updatedAt)`
  ).run(row);

  return row;
}

export function listProjects(): ProjectRecord[] {
  return db
    .prepare(
      `SELECT id, title, status, language, tutorial_title as tutorialTitle, error_text as errorText, created_at as createdAt, updated_at as updatedAt
       FROM projects ORDER BY created_at DESC`
    )
    .all() as ProjectRecord[];
}

export function getProject(projectId: string): ProjectRecord | null {
  const row = db
    .prepare(
      `SELECT id, title, status, language, tutorial_title as tutorialTitle, error_text as errorText, created_at as createdAt, updated_at as updatedAt
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

export function setProjectTutorialTitle(projectId: string, tutorialTitle: string): void {
  db.prepare(`UPDATE projects SET tutorial_title = ?, updated_at = ? WHERE id = ?`).run(tutorialTitle, now(), projectId);
}

export function addAsset(input: {
  projectId: string;
  kind: "image" | "audio" | "zip";
  filePath: string;
  mimeType: string;
  sortOrder: number;
}): AssetRecord {
  const row: AssetRecord = {
    id: randomUUID(),
    projectId: input.projectId,
    kind: input.kind,
    filePath: input.filePath,
    mimeType: input.mimeType,
    sortOrder: input.sortOrder,
    createdAt: now()
  };

  db.prepare(
    `INSERT INTO assets (id, project_id, kind, file_path, mime_type, sort_order, created_at)
     VALUES (@id, @projectId, @kind, @filePath, @mimeType, @sortOrder, @createdAt)`
  ).run(row);

  return row;
}

export function listAssets(projectId: string): AssetRecord[] {
  return db
    .prepare(
      `SELECT id, project_id as projectId, kind, file_path as filePath, mime_type as mimeType, sort_order as sortOrder, created_at as createdAt
       FROM assets WHERE project_id = ? ORDER BY sort_order ASC`
    )
    .all(projectId) as AssetRecord[];
}

export function getAsset(assetId: string): AssetRecord | null {
  const row = db
    .prepare(
      `SELECT id, project_id as projectId, kind, file_path as filePath, mime_type as mimeType, sort_order as sortOrder, created_at as createdAt
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

export function replaceSteps(projectId: string, tutorial: TutorialSchema, orderedAssetIds: string[]): StepRecord[] {
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM steps WHERE project_id = ?`).run(projectId);

    const insert = db.prepare(
      `INSERT INTO steps (id, project_id, step_no, title, instruction, highlight_json, tts_script, notes, asset_id, tts_asset_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    tutorial.steps.forEach((step, index) => {
      insert.run(
        randomUUID(),
        projectId,
        step.step_no,
        step.title,
        step.instruction,
        JSON.stringify(step.highlight),
        step.tts_script ?? null,
        step.notes ?? null,
        orderedAssetIds[index] ?? null,
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

export function listSteps(projectId: string): StepRecord[] {
  const rows = db
    .prepare(
      `SELECT id, project_id as projectId, step_no as stepNo, title, instruction, highlight_json as highlightJson,
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
    title: row.title,
    instruction: row.instruction,
    highlight: JSON.parse(row.highlightJson),
    ttsScript: row.ttsScript,
    notes: row.notes,
    assetId: row.assetId,
    ttsAssetId: row.ttsAssetId,
    createdAt: row.createdAt
  }));
}
