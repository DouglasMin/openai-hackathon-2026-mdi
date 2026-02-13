import Database from "better-sqlite3";
import { dbPath } from "@/lib/paths";

export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
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
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS steps (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  step_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL,
  highlight_json TEXT NOT NULL,
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
`);

const stepColumns = db.prepare("PRAGMA table_info(steps)").all() as Array<{ name: string }>;
if (!stepColumns.some((c) => c.name === "tts_asset_id")) {
  db.exec("ALTER TABLE steps ADD COLUMN tts_asset_id TEXT;");
}
