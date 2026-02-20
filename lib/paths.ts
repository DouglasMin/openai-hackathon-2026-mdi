import path from "node:path";
import fs from "node:fs";

const rootDir = process.cwd();
const normalizedStorageBackend = (process.env.STORAGE_BACKEND ?? "").trim().toLowerCase();
const normalizedDbBackend = (process.env.DB_BACKEND ?? "").trim().toLowerCase();
const shouldUseTmpData = normalizedStorageBackend === "s3" || normalizedDbBackend === "dynamodb";
const dataDir = shouldUseTmpData ? path.join("/tmp", "flowtutor-data") : path.join(rootDir, "data");
const assetDir = path.join(dataDir, "assets");
const exportDir = path.join(dataDir, "exports");
const dbPath = path.join(dataDir, "flowtutor.db");

for (const p of [dataDir, assetDir, exportDir]) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

export { rootDir, dataDir, assetDir, exportDir, dbPath };
