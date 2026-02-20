function norm(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isDynamoDbEnabled(): boolean {
  const backend = norm(process.env.DB_BACKEND);
  const hasTables = Boolean(
    process.env.DDB_PROJECTS_TABLE?.trim() && process.env.DDB_STEPS_TABLE?.trim() && process.env.DDB_ASSETS_TABLE?.trim()
  );
  if (backend === "sqlite") return false;
  return backend === "dynamodb" || hasTables;
}

export function isS3StorageEnabled(): boolean {
  const backend = norm(process.env.STORAGE_BACKEND);
  const hasS3Config = Boolean(process.env.APP_S3_BUCKET?.trim() && process.env.APP_AWS_REGION?.trim());
  if (backend === "local") return false;
  return backend === "s3" || hasS3Config;
}

export function normalizedStorageBackend(): "s3" | "local" {
  return isS3StorageEnabled() ? "s3" : "local";
}
