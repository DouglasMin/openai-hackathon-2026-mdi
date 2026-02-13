import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getAsset } from "@/lib/repo";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const asset = getAsset(assetId);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const buf = await fs.readFile(asset.filePath);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
