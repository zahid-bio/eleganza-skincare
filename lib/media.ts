import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,120}\.(png|jpe?g|webp|gif|avif)$/i;

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export function uploadDirectory(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), ".data", "uploads");
}

export function detectImageExtension(buffer: Uint8Array): string | null {
  if (buffer.length < 12) return null;
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  const header6 = Buffer.from(buffer.subarray(0, 6)).toString("ascii");
  if (header6 === "GIF87a" || header6 === "GIF89a") {
    return "gif";
  }
  const riff = Buffer.from(buffer.subarray(0, 4)).toString("ascii");
  const webp = Buffer.from(buffer.subarray(8, 12)).toString("ascii");
  if (riff === "RIFF" && webp === "WEBP") {
    return "webp";
  }
  const ftyp = Buffer.from(buffer.subarray(4, 8)).toString("ascii");
  const brand = Buffer.from(buffer.subarray(8, 12)).toString("ascii");
  if (
    ftyp === "ftyp" &&
    (brand === "avif" || brand === "avis" || brand === "mif1")
  ) {
    return "avif";
  }
  return null;
}

export async function saveUploadedImage(file: File): Promise<string> {
  if (!file || file.size <= 0) throw new Error("Empty image file.");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("Image file exceeds the 5 MB limit.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = detectImageExtension(bytes);
  if (!ext) {
    throw new Error("Unsupported image format. Use PNG, JPEG, WebP, GIF, or AVIF.");
  }
  const dir = uploadDirectory();
  await mkdir(dir, { recursive: true });
  const filename = `prod-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);
  return "/api/media/" + filename;
}

export async function readUploadedImage(
  filename: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!SAFE_NAME.test(filename)) return null;
  const dir = uploadDirectory();
  const baseDir = path.resolve(/*turbopackIgnore: true*/ dir);
  const fullPath = path.resolve(/*turbopackIgnore: true*/ baseDir, filename);
  if (!fullPath.startsWith(baseDir + path.sep)) return null;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_BY_EXT[ext];
  if (!contentType) return null;
  try {
    const bytes = await readFile(/*turbopackIgnore: true*/ fullPath);
    return { bytes, contentType };
  } catch {
    return null;
  }
}
