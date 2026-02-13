import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { NextResponse } from "next/server";
import { getProject, addAsset, listAssets, setProjectStatus } from "@/lib/repo";
import { assetDir } from "@/lib/paths";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);
const allowedImageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const allowedZipTypes = new Set(["application/zip", "application/x-zip-compressed"]);

function looksLikeZip(file: File): boolean {
  const ext = path.extname(file.name).toLowerCase();
  return allowedZipTypes.has(file.type) || ext === ".zip";
}

function normalizeImageExt(name: string, mimeType: string): string {
  const ext = path.extname(name).toLowerCase();
  if (allowedImageExtensions.has(ext)) return ext;
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/gif") return ".gif";
  if (mimeType === "image/svg+xml") return ".svg";
  return ".bin";
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const form = await req.formData();
  const files = form
    .getAll("files")
    .filter((v): v is File => v instanceof File)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const existing = listAssets(projectId).filter((a) => a.kind === "image").length;
  let addedImages = 0;

  for (const file of files) {
    if (allowedImageTypes.has(file.type)) {
      const ext = normalizeImageExt(file.name, file.type);
      const fileName = `${projectId}-${randomUUID()}${ext}`;
      const target = path.join(assetDir, fileName);
      const arr = await file.arrayBuffer();
      await fs.writeFile(target, Buffer.from(arr));

      addAsset({
        projectId,
        kind: "image",
        filePath: target,
        mimeType: file.type,
        sortOrder: existing + addedImages
      });
      addedImages += 1;
      continue;
    }

    if (looksLikeZip(file)) {
      const arr = await file.arrayBuffer();
      const zipBuffer = Buffer.from(arr);

      const zipName = `${projectId}-${randomUUID()}.zip`;
      const zipPath = path.join(assetDir, zipName);
      await fs.writeFile(zipPath, zipBuffer);
      addAsset({
        projectId,
        kind: "zip",
        filePath: zipPath,
        mimeType: "application/zip",
        sortOrder: 20000 + Date.now()
      });

      const zip = new AdmZip(zipBuffer);
      const entries = zip
        .getEntries()
        .filter((entry) => !entry.isDirectory)
        .filter((entry) => {
          const entryExt = path.extname(entry.entryName).toLowerCase();
          return allowedImageExtensions.has(entryExt);
        })
        .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true, sensitivity: "base" }));

      for (const entry of entries) {
        const entryBuffer = entry.getData();
        const entryExt = path.extname(entry.entryName).toLowerCase() || ".bin";
        const fileName = `${projectId}-${randomUUID()}${entryExt}`;
        const target = path.join(assetDir, fileName);
        await fs.writeFile(target, entryBuffer);

        const mimeType =
          entryExt === ".png"
            ? "image/png"
            : entryExt === ".jpg" || entryExt === ".jpeg"
              ? "image/jpeg"
              : entryExt === ".webp"
                ? "image/webp"
                : entryExt === ".gif"
                  ? "image/gif"
                  : "image/svg+xml";

        addAsset({
          projectId,
          kind: "image",
          filePath: target,
          mimeType,
          sortOrder: existing + addedImages
        });
        addedImages += 1;
      }
    }
  }

  if (!addedImages) {
    return NextResponse.json({ error: "No supported images found. Upload image files or a zip containing images." }, { status: 400 });
  }

  setProjectStatus(projectId, "uploaded");
  return NextResponse.json(getProjectView(projectId), { status: 201 });
}
