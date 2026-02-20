import Database from "better-sqlite3";
import fs from "node:fs";
import { imageSize } from "image-size";
import { dbPath } from "@/lib/paths";

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  project_mode TEXT NOT NULL DEFAULT 'authoring',
  language TEXT NOT NULL,
  tutorial_title TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  image_width INTEGER,
  image_height INTEGER,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  step_no INTEGER NOT NULL,
  asset_index INTEGER,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  highlight_json TEXT NOT NULL,
  image_width INTEGER,
  image_height INTEGER,
  bbox_confidence REAL,
  needs_review INTEGER NOT NULL DEFAULT 0,
  tts_script TEXT,
  notes TEXT,
  asset_id TEXT,
  tts_asset_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(asset_id) REFERENCES assets(id),
  FOREIGN KEY(tts_asset_id) REFERENCES assets(id)
);

CREATE INDEX IF NOT EXISTS idx_assets_project_sort ON assets(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_steps_project_stepno ON steps(project_id, step_no);

CREATE TABLE IF NOT EXISTS scan_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  scan_run_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  evidence TEXT,
  file_path TEXT,
  line_no INTEGER,
  selector TEXT,
  fix_suggestion TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(scan_run_id) REFERENCES scan_runs(id),
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS score_summary (
  scan_run_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  accessibility_score INTEGER NOT NULL,
  scorm_score INTEGER NOT NULL,
  reliability_score INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(scan_run_id) REFERENCES scan_runs(id),
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_scan_runs_project_created ON scan_runs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_run ON issues(scan_run_id);
CREATE INDEX IF NOT EXISTS idx_issues_project_category_severity ON issues(project_id, category, severity);

CREATE TABLE IF NOT EXISTS scorm_cloud_registrations (
  project_id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  registration_id TEXT NOT NULL,
  launch_url TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_successfully INTEGER NOT NULL DEFAULT 0,
  progress_raw TEXT,
  imported_at TEXT,
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
`);

const stepColumns = db.prepare("PRAGMA table_info(steps)").all() as Array<{ name: string }>;
if (!stepColumns.some((c) => c.name === "tts_asset_id")) {
  db.exec("ALTER TABLE steps ADD COLUMN tts_asset_id TEXT;");
}
if (!stepColumns.some((c) => c.name === "asset_index")) {
  db.exec("ALTER TABLE steps ADD COLUMN asset_index INTEGER;");
}
if (!stepColumns.some((c) => c.name === "image_width")) {
  db.exec("ALTER TABLE steps ADD COLUMN image_width INTEGER;");
}
if (!stepColumns.some((c) => c.name === "image_height")) {
  db.exec("ALTER TABLE steps ADD COLUMN image_height INTEGER;");
}
if (!stepColumns.some((c) => c.name === "bbox_confidence")) {
  db.exec("ALTER TABLE steps ADD COLUMN bbox_confidence REAL;");
}
if (!stepColumns.some((c) => c.name === "needs_review")) {
  db.exec("ALTER TABLE steps ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0;");
}

const projectColumns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
if (!projectColumns.some((c) => c.name === "project_mode")) {
  db.exec("ALTER TABLE projects ADD COLUMN project_mode TEXT NOT NULL DEFAULT 'authoring';");
}

const assetColumns = db.prepare("PRAGMA table_info(assets)").all() as Array<{ name: string }>;
if (!assetColumns.some((c) => c.name === "image_width")) {
  db.exec("ALTER TABLE assets ADD COLUMN image_width INTEGER;");
}
if (!assetColumns.some((c) => c.name === "image_height")) {
  db.exec("ALTER TABLE assets ADD COLUMN image_height INTEGER;");
}

function backfillLegacyStepBindings(): void {
  const projects = db.prepare("SELECT id FROM projects").all() as Array<{ id: string }>;

  const projectAssetsStmt = db.prepare(
    `SELECT id, file_path as filePath, image_width as imageWidth, image_height as imageHeight
     FROM assets WHERE project_id = ? AND kind = 'image' ORDER BY sort_order ASC`
  );
  const projectStepsStmt = db.prepare(
    `SELECT id, step_no as stepNo, asset_id as assetId, asset_index as assetIndex, image_width as imageWidth, image_height as imageHeight
     FROM steps WHERE project_id = ? ORDER BY step_no ASC`
  );
  const updateStepStmt = db.prepare(
    `UPDATE steps
     SET asset_id = COALESCE(asset_id, @assetId),
         asset_index = COALESCE(asset_index, @assetIndex),
         image_width = COALESCE(image_width, @imageWidth),
         image_height = COALESCE(image_height, @imageHeight),
         needs_review = CASE
           WHEN (image_width IS NULL OR image_height IS NULL OR image_width <= 0 OR image_height <= 0) THEN 1
           ELSE needs_review
         END
     WHERE id = @id`
  );
  const updateAssetSizeStmt = db.prepare(`UPDATE assets SET image_width = ?, image_height = ? WHERE id = ?`);

  for (const project of projects) {
    const assets = projectAssetsStmt.all(project.id) as Array<{
      id: string;
      filePath: string;
      imageWidth: number | null;
      imageHeight: number | null;
    }>;
    const steps = projectStepsStmt.all(project.id) as Array<{
      id: string;
      stepNo: number;
      assetId: string | null;
      assetIndex: number | null;
      imageWidth: number | null;
      imageHeight: number | null;
    }>;
    if (!assets.length || !steps.length) continue;

    for (let assetIndex = 0; assetIndex < assets.length; assetIndex += 1) {
      const asset = assets[assetIndex];
      if (asset.imageWidth && asset.imageHeight) continue;
      try {
        const dim = imageSize(fs.readFileSync(asset.filePath));
        if (dim.width && dim.height) {
          updateAssetSizeStmt.run(dim.width, dim.height, asset.id);
          asset.imageWidth = dim.width;
          asset.imageHeight = dim.height;
        }
      } catch {
        // Keep null dimensions if unreadable.
      }
    }

    for (const step of steps) {
      const fallbackIndex = Math.max(0, step.stepNo - 1);
      const chosenIndex = step.assetIndex ?? fallbackIndex;
      const byIndex = assets[chosenIndex] ?? assets[Math.min(fallbackIndex, assets.length - 1)] ?? assets[0];
      if (!byIndex) continue;
      updateStepStmt.run({
        id: step.id,
        assetId: step.assetId ?? byIndex.id,
        assetIndex: step.assetIndex ?? chosenIndex,
        imageWidth: step.imageWidth ?? byIndex.imageWidth,
        imageHeight: step.imageHeight ?? byIndex.imageHeight
      });
    }
  }
}

backfillLegacyStepBindings();
