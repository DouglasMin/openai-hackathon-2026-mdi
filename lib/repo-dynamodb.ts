import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  BatchWriteCommand
} from "@aws-sdk/lib-dynamodb";
import type {
  AssetRecord,
  IssueCategory,
  IssueRecord,
  IssueSeverity,
  ProjectMode,
  ProjectRecord,
  ProjectStatus,
  ScanRunRecord,
  ScanStatus,
  ScormCloudRegistrationRecord,
  ScoreSummaryRecord,
  StepRecord,
  TutorialSchema
} from "@/lib/types";
import { cleanEnv } from "@/lib/runtimeConfig";

type DdbConfig = {
  projectsTable: string;
  stepsTable: string;
  assetsTable: string;
  scanRunsTable: string;
  issuesTable: string;
  scoreSummaryTable: string;
  scormCloudRegsTable: string;
};

type AnyItem = Record<string, unknown>;

let cachedDdb: DynamoDBDocumentClient | null = null;
let cachedConfig: DdbConfig | null = null;

const now = () => new Date().toISOString();

function severityRank(severity: IssueSeverity): number {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown): boolean {
  return Boolean(value);
}

function getRegion(): string {
  return cleanEnv(process.env.APP_AWS_REGION) || cleanEnv(process.env.AWS_REGION);
}

function deriveTableName(projectsTable: string, suffix: string): string {
  if (projectsTable.endsWith("-projects")) {
    return `${projectsTable.slice(0, -"-projects".length)}-${suffix}`;
  }
  return `${projectsTable}-${suffix}`;
}

function getConfig(): DdbConfig {
  if (cachedConfig) return cachedConfig;

  const projectsTable = cleanEnv(process.env.DDB_PROJECTS_TABLE);
  const stepsTable = cleanEnv(process.env.DDB_STEPS_TABLE);
  const assetsTable = cleanEnv(process.env.DDB_ASSETS_TABLE);
  if (!projectsTable || !stepsTable || !assetsTable) {
    throw new Error("DB_BACKEND=dynamodb requires DDB_PROJECTS_TABLE, DDB_STEPS_TABLE, DDB_ASSETS_TABLE.");
  }

  cachedConfig = {
    projectsTable,
    stepsTable,
    assetsTable,
    scanRunsTable: cleanEnv(process.env.DDB_SCAN_RUNS_TABLE) || deriveTableName(projectsTable, "scan-runs"),
    issuesTable: cleanEnv(process.env.DDB_ISSUES_TABLE) || deriveTableName(projectsTable, "issues"),
    scoreSummaryTable: cleanEnv(process.env.DDB_SCORE_SUMMARY_TABLE) || deriveTableName(projectsTable, "score-summary"),
    scormCloudRegsTable: cleanEnv(process.env.DDB_SCORM_REG_TABLE) || deriveTableName(projectsTable, "scorm-cloud-registrations")
  };
  return cachedConfig;
}

function ddb(): DynamoDBDocumentClient {
  if (cachedDdb) return cachedDdb;

  const region = getRegion();
  if (!region) {
    throw new Error("DynamoDB backend requires APP_AWS_REGION (or AWS_REGION).");
  }

  const low = new DynamoDBClient({
    region
  });
  cachedDdb = DynamoDBDocumentClient.from(low, {
    marshallOptions: { removeUndefinedValues: true }
  });
  return cachedDdb;
}

async function queryAll(input: {
  tableName: string;
  indexName?: string;
  keyConditionExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  scanIndexForward?: boolean;
}): Promise<AnyItem[]> {
  const client = ddb();
  const out: AnyItem[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await client.send(
      new QueryCommand({
        TableName: input.tableName,
        IndexName: input.indexName,
        KeyConditionExpression: input.keyConditionExpression,
        ExpressionAttributeNames: input.expressionAttributeNames,
        ExpressionAttributeValues: input.expressionAttributeValues,
        ScanIndexForward: input.scanIndexForward,
        ExclusiveStartKey: lastKey
      })
    );
    out.push(...((res.Items as AnyItem[] | undefined) ?? []));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return out;
}

async function scanAll(input: {
  tableName: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  filterExpression?: string;
}): Promise<AnyItem[]> {
  const client = ddb();
  const out: AnyItem[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const res = await client.send(
      new ScanCommand({
        TableName: input.tableName,
        ExpressionAttributeNames: input.expressionAttributeNames,
        ExpressionAttributeValues: input.expressionAttributeValues,
        FilterExpression: input.filterExpression,
        ExclusiveStartKey: lastKey
      })
    );
    out.push(...((res.Items as AnyItem[] | undefined) ?? []));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return out;
}

async function batchDelete(tableName: string, keys: Array<Record<string, unknown>>): Promise<void> {
  const client = ddb();
  const chunks: Array<Array<Record<string, unknown>>> = [];
  for (let i = 0; i < keys.length; i += 25) {
    chunks.push(keys.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    if (!chunk.length) continue;
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((key) => ({
            DeleteRequest: { Key: key }
          }))
        }
      })
    );
  }
}

function toProjectRecord(item: AnyItem): ProjectRecord {
  return {
    id: (asString(item.projectId) ?? asString(item.id) ?? "") as string,
    title: asString(item.title) ?? "",
    status: (asString(item.status) as ProjectStatus) ?? "uploaded",
    mode: (asString(item.mode) as ProjectMode) ?? "authoring",
    language: "ko-KR",
    tutorialTitle: asString(item.tutorialTitle),
    errorText: asString(item.errorText),
    createdAt: asString(item.createdAt) ?? now(),
    updatedAt: asString(item.updatedAt) ?? now()
  };
}

function toAssetRecord(item: AnyItem): AssetRecord {
  return {
    id: (asString(item.assetId) ?? asString(item.id) ?? "") as string,
    projectId: asString(item.projectId) ?? "",
    kind: ((asString(item.kind) ?? "image") as AssetRecord["kind"]),
    filePath: asString(item.filePath) ?? "",
    mimeType: asString(item.mimeType) ?? "application/octet-stream",
    imageWidth: asNumber(item.imageWidth),
    imageHeight: asNumber(item.imageHeight),
    sortOrder: asNumber(item.sortOrder) ?? 0,
    createdAt: asString(item.createdAt) ?? now()
  };
}

function toStepRecord(item: AnyItem): StepRecord {
  const rawHighlight = (item.highlight as Record<string, unknown> | undefined) ?? {};
  return {
    id: asString(item.id) ?? "",
    projectId: asString(item.projectId) ?? "",
    stepNo: asNumber(item.stepNo) ?? 0,
    assetIndex: asNumber(item.assetIndex),
    title: asString(item.title) ?? "",
    instruction: asString(item.instruction) ?? "",
    highlight: {
      x: asNumber(rawHighlight.x) ?? 0,
      y: asNumber(rawHighlight.y) ?? 0,
      w: asNumber(rawHighlight.w) ?? 0,
      h: asNumber(rawHighlight.h) ?? 0
    },
    imageWidth: asNumber(item.imageWidth),
    imageHeight: asNumber(item.imageHeight),
    bboxConfidence: asNumber(item.bboxConfidence),
    needsReview: asBoolean(item.needsReview),
    ttsScript: asString(item.ttsScript),
    notes: asString(item.notes),
    assetId: asString(item.assetId),
    ttsAssetId: asString(item.ttsAssetId),
    createdAt: asString(item.createdAt) ?? now()
  };
}

function toScanRunRecord(item: AnyItem): ScanRunRecord {
  return {
    id: asString(item.id) ?? "",
    projectId: asString(item.projectId) ?? "",
    status: (asString(item.status) as ScanStatus) ?? "queued",
    startedAt: asString(item.startedAt),
    finishedAt: asString(item.finishedAt),
    errorText: asString(item.errorText),
    createdAt: asString(item.createdAt) ?? now()
  };
}

function toIssueRecord(item: AnyItem): IssueRecord {
  return {
    id: asString(item.id) ?? "",
    scanRunId: asString(item.scanRunId) ?? "",
    projectId: asString(item.projectId) ?? "",
    category: (asString(item.category) as IssueCategory) ?? "reliability",
    severity: (asString(item.severity) as IssueSeverity) ?? "low",
    ruleKey: asString(item.ruleKey) ?? "",
    title: asString(item.title) ?? "",
    detail: asString(item.detail) ?? "",
    evidence: asString(item.evidence),
    filePath: asString(item.filePath),
    lineNo: asNumber(item.lineNo),
    selector: asString(item.selector),
    fixSuggestion: asString(item.fixSuggestion),
    createdAt: asString(item.createdAt) ?? now()
  };
}

function toScoreSummaryRecord(item: AnyItem): ScoreSummaryRecord {
  return {
    scanRunId: asString(item.scanRunId) ?? "",
    projectId: asString(item.projectId) ?? "",
    totalScore: asNumber(item.totalScore) ?? 0,
    accessibilityScore: asNumber(item.accessibilityScore) ?? 0,
    scormScore: asNumber(item.scormScore) ?? 0,
    reliabilityScore: asNumber(item.reliabilityScore) ?? 0,
    createdAt: asString(item.createdAt) ?? now(),
    updatedAt: asString(item.updatedAt) ?? now()
  };
}

function toScormCloudRegistrationRecord(item: AnyItem): ScormCloudRegistrationRecord {
  return {
    projectId: asString(item.projectId) ?? "",
    courseId: asString(item.courseId) ?? "",
    registrationId: asString(item.registrationId) ?? "",
    launchUrl: asString(item.launchUrl),
    completed: asBoolean(item.completed),
    completedSuccessfully: asBoolean(item.completedSuccessfully),
    progressRaw: asString(item.progressRaw),
    importedAt: asString(item.importedAt),
    syncedAt: asString(item.syncedAt),
    createdAt: asString(item.createdAt) ?? now(),
    updatedAt: asString(item.updatedAt) ?? now()
  };
}

export async function createProject(title: string, mode: ProjectMode = "authoring"): Promise<ProjectRecord> {
  const cfg = getConfig();
  const row: ProjectRecord = {
    id: randomUUID(),
    title,
    status: "uploaded",
    mode,
    language: "ko-KR",
    tutorialTitle: null,
    errorText: null,
    createdAt: now(),
    updatedAt: now()
  };
  await ddb().send(
    new PutCommand({
      TableName: cfg.projectsTable,
      Item: {
        projectId: row.id,
        ...row
      }
    })
  );
  return row;
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const cfg = getConfig();
  const items = await scanAll({ tableName: cfg.projectsTable });
  return items.map(toProjectRecord).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getProject(projectId: string): Promise<ProjectRecord | null> {
  const cfg = getConfig();
  const res = await ddb().send(
    new GetCommand({
      TableName: cfg.projectsTable,
      Key: { projectId }
    })
  );
  if (!res.Item) return null;
  return toProjectRecord(res.Item as AnyItem);
}

export async function setProjectStatus(projectId: string, status: ProjectStatus, errorText: string | null = null): Promise<void> {
  const cfg = getConfig();
  await ddb().send(
    new UpdateCommand({
      TableName: cfg.projectsTable,
      Key: { projectId },
      UpdateExpression: "SET #status = :status, errorText = :errorText, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": status,
        ":errorText": errorText,
        ":updatedAt": now()
      }
    })
  );
}

export async function setProjectMode(projectId: string, mode: ProjectMode): Promise<void> {
  const cfg = getConfig();
  await ddb().send(
    new UpdateCommand({
      TableName: cfg.projectsTable,
      Key: { projectId },
      UpdateExpression: "SET #mode = :mode, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#mode": "mode" },
      ExpressionAttributeValues: {
        ":mode": mode,
        ":updatedAt": now()
      }
    })
  );
}

export async function setProjectTutorialTitle(projectId: string, tutorialTitle: string): Promise<void> {
  const cfg = getConfig();
  await ddb().send(
    new UpdateCommand({
      TableName: cfg.projectsTable,
      Key: { projectId },
      UpdateExpression: "SET tutorialTitle = :tutorialTitle, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":tutorialTitle": tutorialTitle,
        ":updatedAt": now()
      }
    })
  );
}

export async function setProjectTitle(projectId: string, title: string): Promise<void> {
  const cfg = getConfig();
  await ddb().send(
    new UpdateCommand({
      TableName: cfg.projectsTable,
      Key: { projectId },
      UpdateExpression: "SET title = :title, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":title": title,
        ":updatedAt": now()
      }
    })
  );
}

export async function addAsset(input: {
  projectId: string;
  kind: "image" | "audio" | "zip";
  filePath: string;
  mimeType: string;
  imageWidth?: number | null;
  imageHeight?: number | null;
  sortOrder: number;
}): Promise<AssetRecord> {
  const cfg = getConfig();
  const row: AssetRecord = {
    id: randomUUID(),
    projectId: input.projectId,
    kind: input.kind,
    filePath: input.filePath,
    mimeType: input.mimeType,
    imageWidth: input.imageWidth ?? null,
    imageHeight: input.imageHeight ?? null,
    sortOrder: input.sortOrder,
    createdAt: now()
  };
  await ddb().send(
    new PutCommand({
      TableName: cfg.assetsTable,
      Item: {
        ...row,
        assetId: row.id
      }
    })
  );
  return row;
}

export async function listAssets(projectId: string): Promise<AssetRecord[]> {
  const cfg = getConfig();
  const items = await queryAll({
    tableName: cfg.assetsTable,
    keyConditionExpression: "#projectId = :projectId",
    expressionAttributeNames: { "#projectId": "projectId" },
    expressionAttributeValues: { ":projectId": projectId }
  });
  return items.map(toAssetRecord).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getAsset(assetId: string): Promise<AssetRecord | null> {
  const cfg = getConfig();
  try {
    const indexItems = await queryAll({
      tableName: cfg.assetsTable,
      indexName: "assetId-index",
      keyConditionExpression: "#assetId = :assetId",
      expressionAttributeNames: { "#assetId": "assetId" },
      expressionAttributeValues: { ":assetId": assetId }
    });
    if (indexItems.length) {
      return toAssetRecord(indexItems[0]);
    }
  } catch {
    // Fallback to scan when GSI is not provisioned yet.
  }

  const scanned = await scanAll({
    tableName: cfg.assetsTable,
    expressionAttributeNames: { "#assetId": "assetId" },
    expressionAttributeValues: { ":assetId": assetId },
    filterExpression: "#assetId = :assetId"
  });
  if (!scanned.length) return null;
  return toAssetRecord(scanned[0]);
}

export async function reorderAssets(projectId: string, assetIds: string[]): Promise<void> {
  const cfg = getConfig();
  for (let i = 0; i < assetIds.length; i += 1) {
    await ddb().send(
      new UpdateCommand({
        TableName: cfg.assetsTable,
        Key: {
          projectId,
          assetId: assetIds[i]
        },
        UpdateExpression: "SET sortOrder = :sortOrder",
        ExpressionAttributeValues: {
          ":sortOrder": i
        }
      })
    );
  }
}

export async function replaceSteps(projectId: string, tutorial: TutorialSchema, orderedAssets: AssetRecord[]): Promise<StepRecord[]> {
  const cfg = getConfig();
  const imageAssets = orderedAssets.filter((a) => a.kind === "image");

  const existing = await queryAll({
    tableName: cfg.stepsTable,
    keyConditionExpression: "#projectId = :projectId",
    expressionAttributeNames: { "#projectId": "projectId" },
    expressionAttributeValues: { ":projectId": projectId }
  });
  await batchDelete(
    cfg.stepsTable,
    existing.map((item) => ({ projectId, stepNo: item.stepNo }))
  );

  for (const step of tutorial.steps) {
    const fallbackIndex = Math.min(Math.max(0, step.step_no - 1), Math.max(0, imageAssets.length - 1));
    const assetIndex = Number.isInteger(step.asset_index) ? step.asset_index : fallbackIndex;
    const asset = imageAssets[assetIndex] ?? imageAssets[fallbackIndex] ?? null;
    const needsReview = step.highlight.w <= 0 || step.highlight.h <= 0 || !asset?.imageWidth || !asset?.imageHeight;

    await ddb().send(
      new PutCommand({
        TableName: cfg.stepsTable,
        Item: {
          projectId,
          stepNo: step.step_no,
          id: randomUUID(),
          assetIndex,
          title: step.title,
          instruction: step.instruction,
          highlight: step.highlight,
          imageWidth: asset?.imageWidth ?? null,
          imageHeight: asset?.imageHeight ?? null,
          bboxConfidence: null,
          needsReview,
          ttsScript: step.tts_script ?? null,
          notes: step.notes ?? null,
          assetId: asset?.id ?? null,
          ttsAssetId: null,
          createdAt: now()
        }
      })
    );
  }

  await ddb().send(
    new UpdateCommand({
      TableName: cfg.projectsTable,
      Key: { projectId },
      UpdateExpression: "SET tutorialTitle = :tutorialTitle, #language = :language, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#language": "language"
      },
      ExpressionAttributeValues: {
        ":tutorialTitle": tutorial.tutorial_title,
        ":language": tutorial.language,
        ":updatedAt": now()
      }
    })
  );

  return listSteps(projectId);
}

export async function setStepTtsAsset(projectId: string, stepNo: number, ttsAssetId: string): Promise<void> {
  const cfg = getConfig();
  await ddb().send(
    new UpdateCommand({
      TableName: cfg.stepsTable,
      Key: { projectId, stepNo },
      UpdateExpression: "SET ttsAssetId = :ttsAssetId",
      ExpressionAttributeValues: {
        ":ttsAssetId": ttsAssetId
      }
    })
  );
}

export async function saveEditedSteps(
  projectId: string,
  steps: Array<{
    id?: string | null;
    stepNo: number;
    title: string;
    instruction: string;
    highlight: { x: number; y: number; w: number; h: number };
    notes?: string | null;
    ttsScript?: string | null;
    assetId: string | null;
  }>
): Promise<StepRecord[]> {
  const cfg = getConfig();
  const assets = await listAssets(projectId);
  const imageAssets = assets.filter((a) => a.kind === "image");
  const imageAssetIndex = new Map(imageAssets.map((a, i) => [a.id, i]));
  const previous = await listSteps(projectId);
  const prevById = new Map(previous.map((s) => [s.id, s]));

  await batchDelete(
    cfg.stepsTable,
    previous.map((s) => ({ projectId, stepNo: s.stepNo }))
  );

  const sorted = [...steps].sort((a, b) => a.stepNo - b.stepNo);
  for (let i = 0; i < sorted.length; i += 1) {
    const step = sorted[i];
    const normalizedStepNo = i + 1;
    const previousStep = step.id ? prevById.get(step.id) : undefined;
    const chosenAsset = step.assetId ? imageAssets.find((a) => a.id === step.assetId) ?? null : null;
    const assetIndex = chosenAsset ? (imageAssetIndex.get(chosenAsset.id) ?? normalizedStepNo - 1) : normalizedStepNo - 1;
    const needsReview = step.highlight.w <= 0 || step.highlight.h <= 0 || !chosenAsset?.imageWidth || !chosenAsset?.imageHeight;

    await ddb().send(
      new PutCommand({
        TableName: cfg.stepsTable,
        Item: {
          projectId,
          stepNo: normalizedStepNo,
          id: step.id && prevById.has(step.id) ? step.id : randomUUID(),
          assetIndex,
          title: step.title.trim(),
          instruction: step.instruction.trim(),
          highlight: step.highlight,
          imageWidth: chosenAsset?.imageWidth ?? previousStep?.imageWidth ?? null,
          imageHeight: chosenAsset?.imageHeight ?? previousStep?.imageHeight ?? null,
          bboxConfidence: previousStep?.bboxConfidence ?? null,
          needsReview,
          ttsScript: step.ttsScript ?? previousStep?.ttsScript ?? null,
          notes: step.notes ?? previousStep?.notes ?? "",
          assetId: chosenAsset?.id ?? null,
          ttsAssetId: previousStep?.ttsAssetId ?? null,
          createdAt: now()
        }
      })
    );
  }

  return listSteps(projectId);
}

export async function listSteps(projectId: string): Promise<StepRecord[]> {
  const cfg = getConfig();
  const items = await queryAll({
    tableName: cfg.stepsTable,
    keyConditionExpression: "#projectId = :projectId",
    expressionAttributeNames: { "#projectId": "projectId" },
    expressionAttributeValues: { ":projectId": projectId },
    scanIndexForward: true
  });
  return items.map(toStepRecord).sort((a, b) => a.stepNo - b.stepNo);
}

export async function createScanRun(projectId: string, status: ScanStatus = "queued"): Promise<ScanRunRecord> {
  const cfg = getConfig();
  const row: ScanRunRecord = {
    id: randomUUID(),
    projectId,
    status,
    startedAt: status === "running" ? now() : null,
    finishedAt: null,
    errorText: null,
    createdAt: now()
  };
  await ddb().send(
    new PutCommand({
      TableName: cfg.scanRunsTable,
      Item: row
    })
  );
  return row;
}

export async function updateScanRunStatus(scanRunId: string, status: ScanStatus, errorText: string | null = null): Promise<void> {
  const cfg = getConfig();
  const existing = await getScanRun(scanRunId);
  if (!existing) return;

  const startedAt = existing.startedAt ?? (status === "running" ? now() : null);
  const finishedAt = status === "completed" || status === "failed" ? now() : existing.finishedAt;
  await ddb().send(
    new UpdateCommand({
      TableName: cfg.scanRunsTable,
      Key: { id: scanRunId },
      UpdateExpression: "SET #status = :status, startedAt = :startedAt, finishedAt = :finishedAt, errorText = :errorText",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": status,
        ":startedAt": startedAt,
        ":finishedAt": finishedAt,
        ":errorText": errorText
      }
    })
  );
}

export async function getLatestScanRun(projectId: string): Promise<ScanRunRecord | null> {
  const cfg = getConfig();
  const rows = await queryAll({
    tableName: cfg.scanRunsTable,
    indexName: "project-createdAt-index",
    keyConditionExpression: "#projectId = :projectId",
    expressionAttributeNames: {
      "#projectId": "projectId"
    },
    expressionAttributeValues: {
      ":projectId": projectId
    },
    scanIndexForward: false
  });
  if (!rows.length) return null;
  return toScanRunRecord(rows[0]);
}

export async function listScanRuns(projectId: string): Promise<ScanRunRecord[]> {
  const cfg = getConfig();
  const rows = await queryAll({
    tableName: cfg.scanRunsTable,
    indexName: "project-createdAt-index",
    keyConditionExpression: "#projectId = :projectId",
    expressionAttributeNames: {
      "#projectId": "projectId"
    },
    expressionAttributeValues: {
      ":projectId": projectId
    },
    scanIndexForward: false
  });
  return rows.map(toScanRunRecord);
}

export async function getScanRun(scanRunId: string): Promise<ScanRunRecord | null> {
  const cfg = getConfig();
  const res = await ddb().send(
    new GetCommand({
      TableName: cfg.scanRunsTable,
      Key: { id: scanRunId }
    })
  );
  if (!res.Item) return null;
  return toScanRunRecord(res.Item as AnyItem);
}

export async function addIssue(input: {
  scanRunId: string;
  projectId: string;
  category: IssueCategory;
  severity: IssueSeverity;
  ruleKey: string;
  title: string;
  detail: string;
  evidence?: string | null;
  filePath?: string | null;
  lineNo?: number | null;
  selector?: string | null;
  fixSuggestion?: string | null;
}): Promise<IssueRecord> {
  const cfg = getConfig();
  const row: IssueRecord = {
    id: randomUUID(),
    scanRunId: input.scanRunId,
    projectId: input.projectId,
    category: input.category,
    severity: input.severity,
    ruleKey: input.ruleKey,
    title: input.title,
    detail: input.detail,
    evidence: input.evidence ?? null,
    filePath: input.filePath ?? null,
    lineNo: input.lineNo ?? null,
    selector: input.selector ?? null,
    fixSuggestion: input.fixSuggestion ?? null,
    createdAt: now()
  };
  await ddb().send(
    new PutCommand({
      TableName: cfg.issuesTable,
      Item: {
        ...row
      }
    })
  );
  return row;
}

export async function clearIssuesForRun(scanRunId: string): Promise<void> {
  const cfg = getConfig();
  const rows = await queryAll({
    tableName: cfg.issuesTable,
    keyConditionExpression: "#scanRunId = :scanRunId",
    expressionAttributeNames: { "#scanRunId": "scanRunId" },
    expressionAttributeValues: { ":scanRunId": scanRunId }
  });
  await batchDelete(
    cfg.issuesTable,
    rows.map((r) => ({ scanRunId, id: r.id }))
  );
}

export async function listIssuesForRun(scanRunId: string): Promise<IssueRecord[]> {
  const cfg = getConfig();
  const rows = await queryAll({
    tableName: cfg.issuesTable,
    keyConditionExpression: "#scanRunId = :scanRunId",
    expressionAttributeNames: { "#scanRunId": "scanRunId" },
    expressionAttributeValues: { ":scanRunId": scanRunId }
  });
  return rows
    .map(toIssueRecord)
    .sort((a, b) => {
      const sev = severityRank(b.severity) - severityRank(a.severity);
      if (sev !== 0) return sev;
      return a.createdAt.localeCompare(b.createdAt);
    });
}

function applyIssueFilters(
  rows: IssueRecord[],
  input: {
    projectId: string;
    scanRunId?: string | null;
    category?: IssueCategory | null;
    severity?: IssueSeverity | null;
    q?: string | null;
  }
): IssueRecord[] {
  const q = (input.q ?? "").trim().toLowerCase();
  return rows.filter((row) => {
    if (row.projectId !== input.projectId) return false;
    if (input.scanRunId && row.scanRunId !== input.scanRunId) return false;
    if (input.category && row.category !== input.category) return false;
    if (input.severity && row.severity !== input.severity) return false;
    if (q) {
      const hay = `${row.title} ${row.detail} ${row.ruleKey}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export async function listIssuesFiltered(input: {
  projectId: string;
  scanRunId?: string | null;
  category?: IssueCategory | null;
  severity?: IssueSeverity | null;
  q?: string | null;
  limit?: number;
  offset?: number;
}): Promise<IssueRecord[]> {
  const cfg = getConfig();
  let projectRows: AnyItem[] = [];

  try {
    projectRows = await queryAll({
      tableName: cfg.issuesTable,
      indexName: "project-createdAt-index",
      keyConditionExpression: "#projectId = :projectId",
      expressionAttributeNames: { "#projectId": "projectId" },
      expressionAttributeValues: { ":projectId": input.projectId },
      scanIndexForward: false
    });
  } catch {
    projectRows = await scanAll({
      tableName: cfg.issuesTable,
      expressionAttributeNames: { "#projectId": "projectId" },
      expressionAttributeValues: { ":projectId": input.projectId },
      filterExpression: "#projectId = :projectId"
    });
  }

  const limit = Math.max(1, Math.min(200, input.limit ?? 50));
  const offset = Math.max(0, input.offset ?? 0);
  const filtered = applyIssueFilters(projectRows.map(toIssueRecord), input).sort((a, b) => {
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev !== 0) return sev;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return filtered.slice(offset, offset + limit);
}

export async function countIssuesFiltered(input: {
  projectId: string;
  scanRunId?: string | null;
  category?: IssueCategory | null;
  severity?: IssueSeverity | null;
  q?: string | null;
}): Promise<number> {
  const cfg = getConfig();
  const rows = await scanAll({
    tableName: cfg.issuesTable,
    expressionAttributeNames: { "#projectId": "projectId" },
    expressionAttributeValues: { ":projectId": input.projectId },
    filterExpression: "#projectId = :projectId"
  });
  return applyIssueFilters(rows.map(toIssueRecord), input).length;
}

export async function upsertScoreSummary(input: Omit<ScoreSummaryRecord, "createdAt" | "updatedAt">): Promise<ScoreSummaryRecord> {
  const cfg = getConfig();
  const existing = await getScoreSummary(input.scanRunId);
  const row: ScoreSummaryRecord = {
    ...input,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now()
  };
  await ddb().send(
    new PutCommand({
      TableName: cfg.scoreSummaryTable,
      Item: row
    })
  );
  return row;
}

export async function getScoreSummary(scanRunId: string): Promise<ScoreSummaryRecord | null> {
  const cfg = getConfig();
  const res = await ddb().send(
    new GetCommand({
      TableName: cfg.scoreSummaryTable,
      Key: { scanRunId }
    })
  );
  if (!res.Item) return null;
  return toScoreSummaryRecord(res.Item as AnyItem);
}

export async function getScormCloudRegistration(projectId: string): Promise<ScormCloudRegistrationRecord | null> {
  const cfg = getConfig();
  const res = await ddb().send(
    new GetCommand({
      TableName: cfg.scormCloudRegsTable,
      Key: { projectId }
    })
  );
  if (!res.Item) return null;
  return toScormCloudRegistrationRecord(res.Item as AnyItem);
}

export async function upsertScormCloudRegistration(input: {
  projectId: string;
  courseId: string;
  registrationId: string;
  launchUrl: string | null;
  completed: boolean;
  completedSuccessfully: boolean;
  progressRaw: string | null;
  importedAt: string | null;
  syncedAt: string | null;
}): Promise<ScormCloudRegistrationRecord> {
  const cfg = getConfig();
  const existing = await getScormCloudRegistration(input.projectId);
  const row: ScormCloudRegistrationRecord = {
    ...input,
    createdAt: existing?.createdAt ?? now(),
    updatedAt: now()
  };
  await ddb().send(
    new PutCommand({
      TableName: cfg.scormCloudRegsTable,
      Item: row
    })
  );
  return row;
}

export async function clearScormCloudRegistration(projectId: string): Promise<void> {
  const cfg = getConfig();
  await ddb().send(
    new DeleteCommand({
      TableName: cfg.scormCloudRegsTable,
      Key: { projectId }
    })
  );
}
