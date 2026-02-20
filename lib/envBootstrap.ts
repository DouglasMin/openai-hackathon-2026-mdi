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

  const candidates = [path.join(process.cwd(), ".env.production"), path.join(process.cwd(), ".next", ".env.production")];

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
      return;
    } catch {
      // Ignore file parse errors and continue with existing process.env.
    }
  }
}
