import { readStorageObject } from "@/lib/storage";

type ScormCloudConfig = {
  appId: string;
  secret: string;
  baseUrl: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBaseUrl(baseUrlRaw: string): string {
  const parsed = new URL(baseUrlRaw);
  const withSlash = parsed.toString().endsWith("/") ? parsed.toString() : `${parsed.toString()}/`;
  return withSlash;
}

function getConfig(): ScormCloudConfig | null {
  const appId = process.env.SCORM_CLOUD_APP_ID?.trim() ?? "";
  const secret = process.env.SCORM_CLOUD_SECRET?.trim() ?? "";
  const baseUrlRaw = process.env.SCORM_CLOUD_BASE_URL?.trim() ?? "";
  if (!appId || !secret || !baseUrlRaw) {
    return null;
  }
  return {
    appId,
    secret,
    baseUrl: normalizeBaseUrl(baseUrlRaw)
  };
}

export function isScormCloudConfigured(): boolean {
  return getConfig() !== null;
}

function basicAuth(config: ScormCloudConfig): string {
  return `Basic ${Buffer.from(`${config.appId}:${config.secret}`).toString("base64")}`;
}

function apiUrl(baseUrl: string, endpoint: string): string {
  return new URL(endpoint.replace(/^\//, ""), baseUrl).toString();
}

async function apiRequest<T>(
  config: ScormCloudConfig,
  endpoint: string,
  init: RequestInit
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  headers.set("Authorization", basicAuth(config));

  const url = apiUrl(config.baseUrl, endpoint);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...init,
        headers
      });

      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 500);
        const err = new Error(`SCORM Cloud API ${endpoint} failed (${res.status})${detail ? `: ${detail}` : ""}`);
        if (res.status >= 500 && attempt < 3) {
          lastError = err;
          await sleep(700 * attempt);
          continue;
        }
        throw err;
      }

      if (res.status === 204) {
        return {} as T;
      }

      const text = await res.text();
      if (!text.trim()) {
        return {} as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        return { raw: text } as T;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown SCORM Cloud request error");
      if (attempt >= 3) break;
      await sleep(700 * attempt);
    }
  }

  throw lastError ?? new Error(`SCORM Cloud API ${endpoint} failed`);
}

async function waitForImportComplete(config: ScormCloudConfig, jobId: string): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    const statusRes = await apiRequest<Record<string, unknown>>(config, `/courses/importJobs/${encodeURIComponent(jobId)}`, {
      method: "GET"
    });
    const status = String(statusRes.status ?? "").toUpperCase();
    if (status === "COMPLETE" || status === "COMPLETED") {
      return;
    }
    if (status.includes("FAIL") || status.includes("ERROR")) {
      const msg = String(statusRes.message ?? "Unknown import failure");
      throw new Error(`SCORM Cloud import job failed: ${msg}`);
    }
    await sleep(1500);
  }
  throw new Error("SCORM Cloud import job timeout (did not reach COMPLETE)");
}

export async function createRegistrationLaunchFromZip(input: {
  projectId: string;
  zipPath: string;
  redirectOnExitUrl?: string | null;
}): Promise<{
  courseId: string;
  registrationId: string;
  launchUrl: string;
  importedAt: string;
  syncedAt: string;
}> {
  const config = getConfig();
  if (!config) {
    throw new Error("SCORM Cloud env is not configured.");
  }

  const courseId = `flowtutor-${input.projectId}`;
  const importedAt = new Date().toISOString();
  const zipData = await readStorageObject(input.zipPath);

  const importParams = new URLSearchParams({
    courseId,
    mayCreateNewVersion: "true"
  });
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(zipData)], { type: "application/zip" }), "course.zip");

  const importRes = await apiRequest<Record<string, unknown>>(config, `/courses/importJobs/upload?${importParams.toString()}`, {
    method: "POST",
    body: form
  });
  const jobId = String(importRes.result ?? importRes.id ?? "");
  if (!jobId) {
    throw new Error("SCORM Cloud import job id is missing");
  }
  await waitForImportComplete(config, jobId);

  const registrationId = `flowtutor-${input.projectId}-${Date.now()}`;
  const registrationBody = JSON.stringify({
    courseId,
    registrationId,
    learner: {
      id: `learner-${input.projectId}`,
      firstName: "FlowTutor",
      lastName: "Demo"
    }
  });

  let createError: Error | null = null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await apiRequest<Record<string, unknown>>(config, "/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: registrationBody
      });
      createError = null;
      break;
    } catch (error) {
      createError = error instanceof Error ? error : new Error("Registration creation failed");
      if (attempt === 5) break;
      await sleep(1200 * attempt);
    }
  }
  if (createError) throw createError;

  const launchRes = await apiRequest<{ launchLink?: string } & Record<string, unknown>>(
    config,
    `/registrations/${encodeURIComponent(registrationId)}/launchLink`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(
        input.redirectOnExitUrl
          ? {
              redirectOnExitUrl: input.redirectOnExitUrl
            }
          : {}
      )
    }
  );

  const launchUrl = typeof launchRes.launchLink === "string" ? launchRes.launchLink : "";
  if (!launchUrl) {
    throw new Error("SCORM Cloud launch link is missing in response.");
  }

  return {
    courseId,
    registrationId,
    launchUrl,
    importedAt,
    syncedAt: new Date().toISOString()
  };
}

export async function getRegistrationProgress(registrationId: string): Promise<{
  completed: boolean;
  completedSuccessfully: boolean;
  raw: Record<string, unknown>;
}> {
  const config = getConfig();
  if (!config) {
    throw new Error("SCORM Cloud env is not configured.");
  }

  const raw = await apiRequest<Record<string, unknown>>(
    config,
    `/registrations/${encodeURIComponent(registrationId)}/progress`,
    {
      method: "GET"
    }
  );

  const completed = Boolean(raw.completed);
  const completedSuccessfully = Boolean(raw.completedSuccessfully ?? raw.success ?? raw.passed);
  return { completed, completedSuccessfully, raw };
}
