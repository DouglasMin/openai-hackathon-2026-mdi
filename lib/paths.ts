import path from "node:path";
import fs from "node:fs";

const rootDir = process.cwd();
const shouldUseTmpData = process.env.STORAGE_BACKEND === "s3" || process.env.DB_BACKEND === "dynamodb";
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
