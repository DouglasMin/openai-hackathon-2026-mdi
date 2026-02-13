import path from "node:path";
import fs from "node:fs";

const rootDir = process.cwd();
const dataDir = path.join(rootDir, "data");
const assetDir = path.join(dataDir, "assets");
const exportDir = path.join(dataDir, "exports");
const dbPath = path.join(dataDir, "flowtutor.db");

for (const p of [dataDir, assetDir, exportDir]) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

export { rootDir, dataDir, assetDir, exportDir, dbPath };
