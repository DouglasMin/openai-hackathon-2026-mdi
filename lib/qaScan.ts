import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import OpenAI from "openai";
import { chromium } from "playwright";
import axeCore from "axe-core";
import { listAssets, listSteps } from "@/lib/repo";
import { computeQualityScore } from "@/lib/qaScore";
import { readStorageObject } from "@/lib/storage";
import type { IssueCategory, IssueSeverity, ScoreComputationResult } from "@/lib/types";

type ScanIssueInput = {
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
};

type ScanResult = {
  issues: ScanIssueInput[];
  scoreComputation: ScoreComputationResult;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function scanScormPackage(zipPath: string | null): Promise<{ issues: ScanIssueInput[]; extractedDir: string | null; htmlFiles: string[] }> {
  const issues: ScanIssueInput[] = [];
  if (!zipPath) {
    issues.push({
      category: "scorm",
      severity: "high",
      ruleKey: "scorm.package.missing",
      title: "SCORM zip package not found",
      detail: "No zip asset found in this project. Upload a SCORM/HTML zip package for compliance scan.",
      fixSuggestion: "Upload a course package zip and rerun scan."
    });
    return { issues, extractedDir: null, htmlFiles: [] };
  }

  const zipBuffer = await readStorageObject(zipPath);
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);
  const names = new Set(entries.map((e) => e.entryName.toLowerCase()));
  const hasManifest = names.has("imsmanifest.xml");
  const hasIndex = names.has("index.html");

  if (!hasManifest) {
    issues.push({
      category: "scorm",
      severity: "critical",
      ruleKey: "scorm.manifest.missing",
      title: "imsmanifest.xml is missing",
      detail: "SCORM package does not include imsmanifest.xml.",
      filePath: "imsmanifest.xml",
      fixSuggestion: "Regenerate package with a valid SCORM manifest."
    });
  } else {
    try {
      const manifest = zip.readAsText("imsmanifest.xml");
      if (!/adlcp:scormtype/i.test(manifest)) {
        issues.push({
          category: "scorm",
          severity: "high",
          ruleKey: "scorm.manifest.scormtype_missing",
          title: "adlcp:scormtype attribute is missing",
          detail: "Manifest does not explicitly mark resource as SCO asset.",
          filePath: "imsmanifest.xml",
          fixSuggestion: "Add adlcp:scormtype='sco' to launch resource."
        });
      }
      if (!/href\s*=\s*["']index\.html["']/i.test(manifest)) {
        issues.push({
          category: "scorm",
          severity: "high",
          ruleKey: "scorm.manifest.launch_missing",
          title: "Launch href is not index.html",
          detail: "Manifest launch target could not be validated as index.html.",
          filePath: "imsmanifest.xml",
          fixSuggestion: "Ensure launch resource href points to index.html."
        });
      }
    } catch {
      issues.push({
        category: "scorm",
        severity: "high",
        ruleKey: "scorm.manifest.parse_failed",
        title: "Failed to parse manifest",
        detail: "imsmanifest.xml exists but could not be parsed as text.",
        filePath: "imsmanifest.xml"
      });
    }
  }

  if (!hasIndex) {
    issues.push({
      category: "scorm",
      severity: "critical",
      ruleKey: "scorm.launch.index_missing",
      title: "index.html launch file is missing",
      detail: "SCORM package does not include index.html.",
      filePath: "index.html",
      fixSuggestion: "Include a launchable index.html in package root."
    });
  }

  const extractedDir = await fs.mkdtemp(path.join(os.tmpdir(), "flowtutor-scan-"));
  zip.extractAllTo(extractedDir, true);

  const htmlFiles: string[] = [];
  for (const entry of entries) {
    if (entry.entryName.toLowerCase().endsWith(".html")) {
      htmlFiles.push(path.join(extractedDir, entry.entryName));
    }
  }

  return { issues, extractedDir, htmlFiles };
}

async function scanAccessibility(htmlFiles: string[]): Promise<ScanIssueInput[]> {
  const issues: ScanIssueInput[] = [];
  if (!htmlFiles.length) {
    issues.push({
      category: "accessibility",
      severity: "medium",
      ruleKey: "a11y.html.missing",
      title: "No HTML files to evaluate",
      detail: "Accessibility scan skipped because no HTML files were found in package."
    });
    return issues;
  }

  const axeSource = (axeCore as unknown as { source?: string }).source;
  if (!axeSource) {
    issues.push({
      category: "accessibility",
      severity: "medium",
      ruleKey: "a11y.scan.engine_source_missing",
      title: "Accessibility engine source unavailable",
      detail: "axe-core source could not be loaded in runtime."
    });
    return issues;
  }
  const browser = await chromium.launch({ headless: true });

  try {
    const filesToScan = htmlFiles.slice(0, 3);
    for (const filePath of filesToScan) {
      const page = await browser.newPage();
      try {
        await page.goto(`file://${filePath}`, { waitUntil: "domcontentloaded" });
        await page.addScriptTag({ content: axeSource });

        const result = (await page.evaluate(async () => {
          const win = window as unknown as { axe?: { run: (doc: Document, opts: unknown) => Promise<unknown> } };
          const axeResult = await win.axe?.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
          return axeResult;
        })) as { violations?: Array<Record<string, unknown>> } | null;

        const violations = Array.isArray(result?.violations) ? result.violations : [];
        for (const rawViolation of violations.slice(0, 10)) {
          const violation = rawViolation as {
            id?: string;
            impact?: string;
            help?: string;
            description?: string;
            helpUrl?: string;
            nodes?: Array<{ failureSummary?: string; target?: unknown[] }>;
          };
          const node = Array.isArray(violation.nodes) ? violation.nodes[0] : null;
          issues.push({
            category: "accessibility",
            severity:
              violation.impact === "critical"
                ? "critical"
                : violation.impact === "serious"
                  ? "high"
                  : violation.impact === "moderate"
                    ? "medium"
                    : "low",
            ruleKey: `axe.${violation.id ?? "unknown"}`,
            title: violation.help ?? violation.id ?? "Axe violation",
            detail: violation.description ?? "Accessibility issue detected by axe-core.",
            evidence: node?.failureSummary ?? null,
            filePath: path.basename(filePath),
            selector: Array.isArray(node?.target) && node.target.length ? String(node.target[0]) : null,
            fixSuggestion: violation.helpUrl ?? null
          });
        }
      } catch {
        issues.push({
          category: "accessibility",
          severity: "medium",
          ruleKey: "a11y.scan.file_failed",
          title: "Failed to scan HTML file",
          detail: "Accessibility scan failed for one HTML file.",
          filePath: path.basename(filePath)
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return issues;
}

async function scanReliabilityWithOpenAI(projectId: string, htmlFiles: string[]): Promise<ScanIssueInput[]> {
  const issues: ScanIssueInput[] = [];
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    issues.push({
      category: "reliability",
      severity: "low",
      ruleKey: "reliability.scan.skipped_no_api_key",
      title: "Reliability scan skipped",
      detail: "OPENAI_API_KEY is missing, so reliability scan was not executed."
    });
    return issues;
  }

  const snippets: Array<{ file: string; text: string }> = [];
  for (const filePath of htmlFiles.slice(0, 3)) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const text = stripHtml(raw).slice(0, 3500);
      if (text) snippets.push({ file: path.basename(filePath), text });
    } catch {
      // ignore file read failures for reliability scan
    }
  }

  if (!snippets.length) {
    issues.push({
      category: "reliability",
      severity: "low",
      ruleKey: "reliability.scan.no_content",
      title: "No textual content found",
      detail: "No readable content was found for reliability validation."
    });
    return issues;
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL_QA ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const response = await openai.responses.create({
    model,
    instructions:
      "You are a content reliability auditor for eLearning QA. Return output strictly as JSON by provided schema. " +
      "Flag potentially unsupported claims, numeric statements without evidence, and risky compliance wording. " +
      "If no notable issues exist, return empty flags array.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `project_id=${projectId}\n` + snippets.map((s) => `FILE:${s.file}\n${s.text}`).join("\n\n---\n\n")
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "reliability_report",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            flags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  title: { type: "string" },
                  detail: { type: "string" },
                  evidence: { type: "string" },
                  file: { type: "string" },
                  fix_suggestion: { type: "string" }
                },
                required: ["severity", "title", "detail", "evidence", "file", "fix_suggestion"],
                additionalProperties: false
              }
            }
          },
          required: ["summary", "flags"],
          additionalProperties: false
        }
      }
    }
  });

  const output = response.output_text;
  if (!output) {
    issues.push({
      category: "reliability",
      severity: "low",
      ruleKey: "reliability.scan.empty_output",
      title: "Reliability scan returned empty output",
      detail: "Model returned no output_text."
    });
    return issues;
  }

  const parsed = JSON.parse(output) as {
    summary: string;
    flags: Array<{ severity: IssueSeverity; title: string; detail: string; evidence: string; file: string; fix_suggestion: string }>;
  };

  for (const flag of parsed.flags) {
    issues.push({
      category: "reliability",
      severity: flag.severity,
      ruleKey: "reliability.flag",
      title: flag.title,
      detail: flag.detail,
      evidence: flag.evidence,
      filePath: flag.file || null,
      fixSuggestion: flag.fix_suggestion
    });
  }

  return issues;
}

export async function runQualityScan(projectId: string): Promise<ScanResult> {
  const issues: ScanIssueInput[] = [];
  const assets = await listAssets(projectId);
  const zipAssets = assets
    .filter((a) => a.kind === "zip")
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const sourceZip = zipAssets[0]?.filePath ?? null;

  const { issues: scormIssues, extractedDir, htmlFiles } = await scanScormPackage(sourceZip);
  issues.push(...scormIssues);

  try {
    const a11yIssues = await scanAccessibility(htmlFiles);
    issues.push(...a11yIssues);
  } catch (e) {
    issues.push({
      category: "accessibility",
      severity: "medium",
      ruleKey: "a11y.scan.engine_failed",
      title: "Accessibility scan engine failed",
      detail: e instanceof Error ? e.message : "Unknown accessibility scan error."
    });
  }

  try {
    const reliabilityIssues = await scanReliabilityWithOpenAI(projectId, htmlFiles);
    issues.push(...reliabilityIssues);
  } catch (e) {
    issues.push({
      category: "reliability",
      severity: "medium",
      ruleKey: "reliability.scan.failed",
      title: "Reliability scan failed",
      detail: e instanceof Error ? e.message : "Unknown reliability scan error."
    });
  }

  if (!sourceZip && (await listSteps(projectId)).length > 0) {
    issues.push({
      category: "scorm",
      severity: "low",
      ruleKey: "scorm.hint.export_recommended",
      title: "Run scan against exported package",
      detail: "This project has authored steps but no exported zip. Export SCORM first for full package validation.",
      fixSuggestion: "Run Export SCORM and rerun scan."
    });
  }

  if (extractedDir) {
    await fs.rm(extractedDir, { recursive: true, force: true }).catch(() => {});
  }

  return {
    issues,
    scoreComputation: computeQualityScore(issues.map((i) => ({ category: i.category, severity: i.severity })))
  };
}
