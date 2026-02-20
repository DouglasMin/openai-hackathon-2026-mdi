function clean(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function norm(value: string | undefined): string {
  return clean(value).toLowerCase();
}

function inAwsRuntime(): boolean {
  return Boolean(process.env.AWS_EXECUTION_ENV || process.env.AWS_REGION || process.env.APP_AWS_REGION);
}

export function isDynamoDbEnabled(): boolean {
  const backend = norm(process.env.DB_BACKEND);
  const hasTables = Boolean(
    clean(process.env.DDB_PROJECTS_TABLE) && clean(process.env.DDB_STEPS_TABLE) && clean(process.env.DDB_ASSETS_TABLE)
  );
  if (backend === "dynamodb") return true;
  if (backend === "sqlite") return false;
  if (hasTables) return true;
  if (inAwsRuntime()) return true;
  return false;
}

export function isS3StorageEnabled(): boolean {
  const backend = norm(process.env.STORAGE_BACKEND);
  const hasS3Config = Boolean(clean(process.env.APP_S3_BUCKET) && clean(process.env.APP_AWS_REGION));
  if (backend === "local") return false;
  return backend === "s3" || hasS3Config;
}

export function normalizedStorageBackend(): "s3" | "local" {
  return isS3StorageEnabled() ? "s3" : "local";
}

export function readCleanEnv(name: string): string {
  return clean(process.env[name]);
}
