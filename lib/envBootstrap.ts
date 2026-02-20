import fs from "node:fs";
import path from "node:path";

let bootstrapped = false;

function stripOptionalQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  const value = stripOptionalQuotes(trimmed.slice(eq + 1));
  if (!key) return null;
  return { key, value };
}

export function bootstrapEnvFromFile(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  const candidates = [
    path.join(process.cwd(), ".env.production"),
    path.join(process.cwd(), ".env.runtime"),
    path.join(process.cwd(), ".next", ".env.production"),
    path.join(process.cwd(), ".next", "env.production"),
    path.join(process.cwd(), ".next", "standalone", ".env.production"),
    path.join(process.cwd(), ".amplify-hosting", "compute", "default", ".env.production"),
    path.join(process.cwd(), ".amplify-hosting", "compute", "default", ".env.runtime"),
    path.join("/var", "task", ".env.production"),
    path.join("/var", "task", ".env.runtime"),
    path.join("/var", "task", ".next", ".env.production"),
    path.join("/var", "task", ".next", "env.production"),
    path.join("/var", "task", ".next", "standalone", ".env.production")
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const raw = fs.readFileSync(file, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const parsed = parseLine(line);
        if (!parsed) continue;
        if (!process.env[parsed.key] || process.env[parsed.key] === "") {
          process.env[parsed.key] = parsed.value;
        }
      }
      // Bridge app-prefixed envs to AWS SDK default names.
      const appAccessKey = process.env.APP_AWS_ACCESS_KEY_ID;
      const appSecretKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
      const appRegion = process.env.APP_AWS_REGION;
      if (!process.env.AWS_ACCESS_KEY_ID && appAccessKey) process.env.AWS_ACCESS_KEY_ID = appAccessKey;
      if (!process.env.AWS_SECRET_ACCESS_KEY && appSecretKey) process.env.AWS_SECRET_ACCESS_KEY = appSecretKey;
      if (!process.env.AWS_REGION && appRegion) process.env.AWS_REGION = appRegion;
      return;
    } catch {
      // Ignore file parse errors and continue with existing process.env.
    }
  }

  // Bridge app-prefixed envs even when no env file was found.
  const appAccessKey = process.env.APP_AWS_ACCESS_KEY_ID;
  const appSecretKey = process.env.APP_AWS_SECRET_ACCESS_KEY;
  const appRegion = process.env.APP_AWS_REGION;
  if (!process.env.AWS_ACCESS_KEY_ID && appAccessKey) process.env.AWS_ACCESS_KEY_ID = appAccessKey;
  if (!process.env.AWS_SECRET_ACCESS_KEY && appSecretKey) process.env.AWS_SECRET_ACCESS_KEY = appSecretKey;
  if (!process.env.AWS_REGION && appRegion) process.env.AWS_REGION = appRegion;
}
