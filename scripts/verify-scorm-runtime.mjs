#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

function fail(message) {
  console.error(`SCORM runtime check failed: ${message}`);
  process.exit(1);
}

function latestZipPath() {
  const exportDir = path.join(process.cwd(), "data", "exports");
  if (!fs.existsSync(exportDir)) {
    fail(`export directory not found: ${exportDir}`);
  }

  const files = fs
    .readdirSync(exportDir)
    .filter((name) => name.endsWith(".zip"))
    .map((name) => {
      const p = path.join(exportDir, name);
      return { path: p, mtime: fs.statSync(p).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (!files.length) {
    fail("no SCORM zip found in data/exports. Export once first.");
  }

  return files[0].path;
}

function unzipToTemp(zipPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flowtutor-scorm-"));
  execFileSync("unzip", ["-q", "-o", zipPath, "-d", tmpDir], { stdio: "pipe" });
  return tmpDir;
}

function validateCallOrder(calls) {
  if (!Array.isArray(calls) || calls.length < 4) {
    fail(`expected at least 4 SCORM calls, got ${JSON.stringify(calls)}`);
  }

  const names = calls.map((c) => c[0]);
  const initIndex = names.indexOf("LMSInitialize");
  const setIndex = names.findIndex((c, i) => c === "LMSSetValue" && calls[i][1] === "cmi.core.lesson_status" && calls[i][2] === "completed");
  const commitIndex = names.indexOf("LMSCommit");
  const finishIndex = names.indexOf("LMSFinish");

  if (initIndex < 0) fail("LMSInitialize was not called");
  if (setIndex < 0) fail("LMSSetValue(cmi.core.lesson_status, completed) was not called");
  if (commitIndex < 0) fail("LMSCommit was not called");
  if (finishIndex < 0) fail("LMSFinish was not called");

  if (!(initIndex < setIndex && setIndex < commitIndex && commitIndex < finishIndex)) {
    fail(`call order invalid: ${JSON.stringify(calls)}`);
  }
}

async function run() {
  const zipPath = latestZipPath();
  const extractedDir = unzipToTemp(zipPath);
  const indexPath = path.join(extractedDir, "index.html");

  if (!fs.existsSync(indexPath)) {
    fail(`index.html not found in extracted zip: ${indexPath}`);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on("dialog", async (dialog) => {
    await dialog.accept();
  });

  await page.addInitScript(() => {
    window.__scormCalls = [];
    window.API = {
      LMSInitialize(arg) {
        window.__scormCalls.push(["LMSInitialize", arg]);
        return "true";
      },
      LMSSetValue(key, value) {
        window.__scormCalls.push(["LMSSetValue", key, value]);
        return "true";
      },
      LMSCommit(arg) {
        window.__scormCalls.push(["LMSCommit", arg]);
        return "true";
      },
      LMSFinish(arg) {
        window.__scormCalls.push(["LMSFinish", arg]);
        return "true";
      }
    };
  });

  await page.goto(`file://${indexPath}`);
  await page.waitForSelector("#next", { timeout: 10000 });

  for (let i = 0; i < 200; i += 1) {
    const completeVisible = await page.isVisible("#complete");
    if (completeVisible) break;
    await page.click("#next");
  }

  if (!(await page.isVisible("#complete"))) {
    await browser.close();
    fail("complete button did not become visible; could not reach last step");
  }

  await page.click("#complete");
  await page.waitForTimeout(150);

  const calls = await page.evaluate(() => window.__scormCalls ?? []);
  await browser.close();

  validateCallOrder(calls);

  console.log("SCORM runtime check passed.");
  console.log(`zip: ${zipPath}`);
  console.log(`calls: ${JSON.stringify(calls)}`);
}

run().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
