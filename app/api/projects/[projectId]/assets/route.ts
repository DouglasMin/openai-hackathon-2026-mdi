import { randomUUID } from "node:crypto";
import path from "node:path";
import AdmZip from "adm-zip";
import { imageSize } from "image-size";
import { NextResponse } from "next/server";
import { getProject, addAsset, listAssets, setProjectStatus } from "@/lib/repo";
import { writeStorageObject } from "@/lib/storage";
import { getProjectView } from "@/lib/view";

export const runtime = "nodejs";

const allowedImageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]);
const allowedImageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const allowedZipTypes = new Set(["application/zip", "application/x-zip-compressed"]);

function looksLikeZip(file: File): boolean {
  const ext = path.extname(file.name).toLowerCase();
  return allowedZipTypes.has(file.type) || ext === ".zip";
}

function looksLikeImage(file: File): boolean {
  const ext = path.extname(file.name).toLowerCase();
  return allowedImageTypes.has(file.type) || allowedImageExtensions.has(ext);
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

function readDimensions(content: Buffer): { width: number | null; height: number | null } {
  try {
    const size = imageSize(content);
    return { width: size.width ?? null, height: size.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const form = await req.formData();
    const files = form
      .getAll("files")
      .filter((v): v is File => v instanceof File)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const existing = (await listAssets(projectId)).filter((a) => a.kind === "image").length;
    let addedImages = 0;

    for (const file of files) {
      if (looksLikeImage(file)) {
        const normalizedType =
          file.type && allowedImageTypes.has(file.type)
            ? file.type
            : path.extname(file.name).toLowerCase() === ".png"
              ? "image/png"
              : path.extname(file.name).toLowerCase() === ".jpg" || path.extname(file.name).toLowerCase() === ".jpeg"
                ? "image/jpeg"
                : path.extname(file.name).toLowerCase() === ".webp"
                  ? "image/webp"
                  : path.extname(file.name).toLowerCase() === ".gif"
                    ? "image/gif"
                    : "image/svg+xml";
        const ext = normalizeImageExt(file.name, normalizedType);
        const fileName = `${projectId}-${randomUUID()}${ext}`;
        const arr = await file.arrayBuffer();
        const content = Buffer.from(arr);
        const locator = await writeStorageObject({
          category: "assets",
          projectId,
          fileName,
          body: content,
          contentType: normalizedType
        });
        const { width, height } = readDimensions(content);

        await addAsset({
          projectId,
          kind: "image",
          filePath: locator,
          mimeType: normalizedType,
          imageWidth: width,
          imageHeight: height,
          sortOrder: existing + addedImages
        });
        addedImages += 1;
        continue;
      }

      if (looksLikeZip(file)) {
        const arr = await file.arrayBuffer();
        const zipBuffer = Buffer.from(arr);

        const zipName = `${projectId}-${randomUUID()}.zip`;
        const zipPath = await writeStorageObject({
          category: "assets",
          projectId,
          fileName: zipName,
          body: zipBuffer,
          contentType: "application/zip"
        });
        await addAsset({
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
          const target = await writeStorageObject({
            category: "assets",
            projectId,
            fileName,
            body: entryBuffer
          });

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
          const { width, height } = readDimensions(entryBuffer);

          await addAsset({
            projectId,
            kind: "image",
            filePath: target,
            mimeType,
            imageWidth: width,
            imageHeight: height,
            sortOrder: existing + addedImages
          });
          addedImages += 1;
        }
      }
    }

    if (!addedImages) {
      return NextResponse.json({ error: "No supported images found. Upload image files or a zip containing images." }, { status: 400 });
    }

    await setProjectStatus(projectId, "uploaded");
    return NextResponse.json(await getProjectView(projectId), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Asset upload failed";
    console.error("[/api/projects/:projectId/assets][POST]", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
