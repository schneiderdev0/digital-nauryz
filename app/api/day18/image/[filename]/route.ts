import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getDay18QuizImagePath } from "@/lib/day18-quiz";

const ALLOWED_EXTENSIONS = new Set([".webp", ".png", ".jpg", ".jpeg"]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const safeFilename = path.basename(filename);
    const extension = path.extname(safeFilename).toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: "Unsupported image type." }, { status: 400 });
    }

    const fileBuffer = await readFile(getDay18QuizImagePath(safeFilename));

    return new NextResponse(fileBuffer, {
      headers: {
        "content-type":
          extension === ".png"
            ? "image/png"
            : extension === ".jpg" || extension === ".jpeg"
              ? "image/jpeg"
              : "image/webp",
        "cache-control": "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error("Day 18 image route failed:", error);
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}
