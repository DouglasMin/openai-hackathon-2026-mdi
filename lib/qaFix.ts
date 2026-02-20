import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import AdmZip from "adm-zip";
import { createTwoFilesPatch } from "diff";
import { load } from "cheerio";
import { addAsset, getProject, listAssets } from "@/lib/repo";
import { readStorageObject, storageLocatorByName, writeStorageObject } from "@/lib/storage";

type FixCounts = {
  imgAltAdded: number;
  buttonAriaLabelAdded: number;
  inputAriaLabelAdded: number;
  headingAdjusted: number;
};

type FileFixResult = {
  filePath: string;
  changed: boolean;
  before: string;
  after: string;
  counts: FixCounts;
};

type FixRunResult = {
  zipAssetId: string;
  zipDownloadUrl: string;
  diffDownloadUrl: string;
  changedFiles: number;
  totalFixes: FixCounts;
  fixedZipName: string;
  diffName: string;
};

function zeroCounts(): FixCounts {
  return {
    imgAltAdded: 0,
    buttonAriaLabelAdded: 0,
    inputAriaLabelAdded: 0,
    headingAdjusted: 0
  };
}

async function listHtmlFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop() as string;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        const lower = entry.name.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) {
          files.push(full);
        }
      }
    }
  }

  return files;
}

function applyHtmlFixes(content: string, filePath: string): FileFixResult {
  const counts = zeroCounts();
  const before = content;
  const $ = load(content);

  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined || alt.trim() === "") {
      $(el).attr("alt", "Image");
      counts.imgAltAdded += 1;
    }
  });

  $("button").each((_, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr("aria-label");
    const title = $(el).attr("title");
    if (!text && !ariaLabel && !title) {
      $(el).attr("aria-label", "Action button");
      counts.buttonAriaLabelAdded += 1;
    }
  });

  $("input, select, textarea").each((_, el) => {
    const node = $(el);
    const tag = (el.tagName || "").toLowerCase();
    const type = (node.attr("type") || "").toLowerCase();
    if (tag === "input" && (type === "hidden" || type === "submit" || type === "button")) {
      return;
    }
    if (node.attr("aria-label")) return;

    const id = node.attr("id");
    if (id && $(`label[for="${id}"]`).length > 0) return;

    const placeholder = node.attr("placeholder");
    const name = node.attr("name");
    const fallback = (placeholder && placeholder.trim()) || (name && name.trim()) || "Input field";
    node.attr("aria-label", fallback);
    counts.inputAriaLabelAdded += 1;
  });

  const headings = $("h1,h2,h3,h4,h5,h6").toArray();
  let seenH1 = false;
  let prevLevel = 0;
  for (const el of headings) {
    const currentTag = (el.tagName || "").toLowerCase();
    const level = Number.parseInt(currentTag.slice(1), 10);
    if (!Number.isFinite(level)) continue;

    let target = level;
    if (!seenH1) {
      target = 1;
      seenH1 = true;
    } else {
      if (target === 1) target = 2;
      if (prevLevel > 0 && target > prevLevel + 1) target = prevLevel + 1;
    }

    if (target !== level) {
      el.tagName = `h${target}`;
      counts.headingAdjusted += 1;
    }
    prevLevel = target;
  }

  const after = $.html();
  return {
    filePath,
    changed: before !== after,
    before,
    after,
    counts
  };
}

function sumCounts(items: FixCounts[]): FixCounts {
  return items.reduce(
    (acc, cur) => ({
      imgAltAdded: acc.imgAltAdded + cur.imgAltAdded,
      buttonAriaLabelAdded: acc.buttonAriaLabelAdded + cur.buttonAriaLabelAdded,
      inputAriaLabelAdded: acc.inputAriaLabelAdded + cur.inputAriaLabelAdded,
      headingAdjusted: acc.headingAdjusted + cur.headingAdjusted
    }),
    zeroCounts()
  );
}

function buildDiffText(changed: Array<{ relPath: string; before: string; after: string }>, summary: FixCounts): string {
  const header =
    `# Auto Fix Summary\n` +
    `- img alt added: ${summary.imgAltAdded}\n` +
    `- button aria-label added: ${summary.buttonAriaLabelAdded}\n` +
    `- input/select/textarea aria-label added: ${summary.inputAriaLabelAdded}\n` +
    `- heading adjusted: ${summary.headingAdjusted}\n\n`;

  const patches = changed
    .map((item) =>
      createTwoFilesPatch(item.relPath, item.relPath, item.before, item.after, "before", "after", {
        context: 2
      })
    )
    .join("\n\n");
  return header + patches;
}

export async function runAutoFix(projectId: string): Promise<FixRunResult> {
  if (!(await getProject(projectId))) {
    throw new Error("Project not found");
  }

  const sourceZip = (await listAssets(projectId))
    .filter((a) => a.kind === "zip")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  if (!sourceZip) {
    throw new Error("No zip asset found to fix");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "flowtutor-fix-"));
  const sourceBuffer = await readStorageObject(sourceZip.filePath);
  const zip = new AdmZip(sourceBuffer);
  zip.extractAllTo(tempDir, true);

  const htmlFiles = await listHtmlFiles(tempDir);
  if (!htmlFiles.length) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw new Error("No HTML files in zip. Nothing to auto-fix.");
  }

  const changedFiles: Array<{ relPath: string; before: string; after: string; counts: FixCounts }> = [];
  for (const filePath of htmlFiles) {
    const before = await fs.readFile(filePath, "utf-8");
    const result = applyHtmlFixes(before, filePath);
    if (result.changed) {
      await fs.writeFile(filePath, result.after, "utf-8");
      changedFiles.push({
        relPath: path.relative(tempDir, filePath),
        before: result.before,
        after: result.after,
        counts: result.counts
      });
    }
  }

  const totalFixes = sumCounts(changedFiles.map((c) => c.counts));
  const fixedZipName = `qa-fix-${projectId}-${Date.now()}.zip`;
  const diffName = `qa-fix-${projectId}-${Date.now()}.diff.txt`;
  const fixedZipPath = path.join(tempDir, fixedZipName);
  const diffPath = path.join(tempDir, diffName);

  const outZip = new AdmZip();
  outZip.addLocalFolder(tempDir);
  outZip.writeZip(fixedZipPath);

  const diffText = buildDiffText(
    changedFiles.map((c) => ({ relPath: c.relPath, before: c.before, after: c.after })),
    totalFixes
  );
  await fs.writeFile(diffPath, diffText, "utf-8");
  const fixedZipBuffer = await fs.readFile(fixedZipPath);
  const diffBuffer = await fs.readFile(diffPath);
  const fixedZipLocator = await writeStorageObject({
    category: "qa",
    projectId,
    fileName: fixedZipName,
    body: fixedZipBuffer,
    contentType: "application/zip"
  });
  await writeStorageObject({
    category: "qa",
    projectId,
    fileName: diffName,
    body: diffBuffer,
    contentType: "text/plain; charset=utf-8"
  });

  const zipAsset = await addAsset({
    projectId,
    kind: "zip",
    filePath: fixedZipLocator,
    mimeType: "application/zip",
    sortOrder: Date.now()
  });

  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

  return {
    zipAssetId: zipAsset.id,
    zipDownloadUrl: `/api/assets/${zipAsset.id}`,
    diffDownloadUrl: `/api/projects/${projectId}/fix?download=1&file=${encodeURIComponent(diffName)}`,
    changedFiles: changedFiles.length,
    totalFixes,
    fixedZipName,
    diffName
  };
}

export function resolveFixArtifact(projectId: string, fileNameRaw: string): { path: string; contentType: string; fileName: string } {
  const fileName = path.basename(fileNameRaw);
  if (!fileName.startsWith(`qa-fix-${projectId}-`)) {
    throw new Error("Invalid artifact filename");
  }
  const full = storageLocatorByName("qa", projectId, fileName);
  const contentType = fileName.endsWith(".zip") ? "application/zip" : "text/plain; charset=utf-8";
  return { path: full, contentType, fileName };
}
