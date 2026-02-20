import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { assetDir, exportDir } from "@/lib/paths";
import { cleanEnv, normalizedStorageBackend } from "@/lib/runtimeConfig";

export type StorageCategory = "assets" | "exports" | "qa" | "vpat";

type StorageBackend = "local" | "s3";

const storageBackend: StorageBackend = normalizedStorageBackend();
const defaultAwsAccountId = "863518440691";
const s3Region = cleanEnv(process.env.APP_AWS_REGION) || cleanEnv(process.env.AWS_REGION) || "ap-northeast-2";

function inferBucketFromDdbTable(): string {
  const projectsTable = cleanEnv(process.env.DDB_PROJECTS_TABLE);
  if (!projectsTable || !projectsTable.endsWith("-projects")) return "";
  const prefix = projectsTable.slice(0, -"-projects".length);
  const accountId = cleanEnv(process.env.APP_AWS_ACCOUNT_ID) || cleanEnv(process.env.AWS_ACCOUNT_ID) || defaultAwsAccountId;
  return `${prefix}-${accountId}-assets`;
}

const s3Bucket = cleanEnv(process.env.APP_S3_BUCKET) || cleanEnv(process.env.AWS_S3_BUCKET) || inferBucketFromDdbTable();
const s3Prefix = (cleanEnv(process.env.APP_S3_PREFIX) || cleanEnv(process.env.AWS_S3_PREFIX)).replace(/^\/+|\/+$/g, "");

let cachedS3: S3Client | null = null;

function assertS3Config(): void {
  if (!s3Region || !s3Bucket) {
    throw new Error(
      `S3 storage is enabled but config is missing (resolved region='${s3Region}', bucket='${s3Bucket}'). ` +
        "Set APP_AWS_REGION/APP_S3_BUCKET."
    );
  }
}

function s3Client(): S3Client {
  if (cachedS3) return cachedS3;
  assertS3Config();

  cachedS3 = new S3Client({
    region: s3Region
  });
  return cachedS3;
}

function localDirByCategory(category: StorageCategory): string {
  if (category === "assets") return assetDir;
  if (category === "exports") return exportDir;
  if (category === "qa") return path.join(exportDir, "qa");
  return path.join(exportDir, "vpat");
}

function sanitizeFileName(fileName: string): string {
  return path.basename(fileName);
}

function buildS3Key(category: StorageCategory, projectId: string, fileName: string): string {
  const clean = sanitizeFileName(fileName);
  const parts = [s3Prefix, category, projectId, clean].filter(Boolean);
  return parts.join("/");
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof (body as { pipe?: unknown }).pipe === "function") return streamToBuffer(body as Readable);
  return Buffer.from([]);
}

export function isS3Storage(): boolean {
  return storageBackend === "s3";
}

export function storageLocatorByName(category: StorageCategory, projectId: string, fileName: string): string {
  if (storageBackend === "s3") {
    return buildS3Key(category, projectId, fileName);
  }
  return path.join(localDirByCategory(category), sanitizeFileName(fileName));
}

export async function writeStorageObject(input: {
  category: StorageCategory;
  projectId: string;
  fileName: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}): Promise<string> {
  const locator = storageLocatorByName(input.category, input.projectId, input.fileName);
  const bodyBuffer = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);

  if (storageBackend === "s3") {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: s3Bucket,
        Key: locator,
        Body: bodyBuffer,
        ContentType: input.contentType
      })
    );
    return locator;
  }

  const dir = path.dirname(locator);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(locator, bodyBuffer);
  return locator;
}

export async function readStorageObject(locator: string): Promise<Buffer> {
  if (storageBackend === "s3") {
    const obj = await s3Client().send(
      new GetObjectCommand({
        Bucket: s3Bucket,
        Key: locator
      })
    );
    return bodyToBuffer(obj.Body);
  }
  return fs.readFile(locator);
}

export function storageFileName(locator: string): string {
  const normalized = locator.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? locator;
}
