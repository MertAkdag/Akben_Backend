/**
 * Catalog Overlay Media Processor
 *
 * Yüklenen ham görseli ffmpeg ile webp formatına çevirir ve iki farklı
 * boyutta (large=800px, medium=400px) saklar. Mevcut /media static mount
 * üzerinden serve edilir.
 *
 * Tasarım, story-media.processor.ts ile aynı yaklaşımı kullanır — projeye
 * yeni bağımlılık eklemez (sharp yok, ffmpeg yeterli).
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import { ApiError } from "../../utils/apiError";
import { getStoryMediaRuntimeConfig } from "../../config/storyMedia";

export type ProcessOverlayInput = {
  buffer: Buffer;
  contentType?: string;
  originalFilename?: string;
  /** Bu overlay için klasör adı — categoryId */
  folder: string;
};

export type ProcessedOverlay = {
  /**
   * DB'ye yazılacak göreli path — örn. "/media/category-overlays/1/large.webp"
   * Frontend'e gönderilmeden önce GET endpoint'inde origin ile prefix'lenir.
   */
  imageRelPath: string;
  imageRelPathMedium: string;
  bytes: number;
};

const config = getStoryMediaRuntimeConfig();

const LARGE_WIDTH = 800;
const MEDIUM_WIDTH = 400;
const WEBP_QUALITY = 82;

export async function processOverlayImage(
  input: ProcessOverlayInput,
): Promise<ProcessedOverlay> {
  if (!isImageBuffer(input.buffer, input.contentType)) {
    throw new ApiError(
      415,
      "media_type_mismatch",
      "Only image uploads are accepted for category overlays.",
    );
  }

  const assetDir = path.join(config.storageDir, "category-overlays", input.folder);
  const tmpDir = path.join(config.tmpDir, "category-overlays", input.folder);
  const inputExt = inferExtension(input.buffer, input.contentType, input.originalFilename);
  const inputPath = path.join(tmpDir, `upload.${inputExt}`);
  const largePath = path.join(assetDir, "large.webp");
  const mediumPath = path.join(assetDir, "medium.webp");

  // Eski dosyaları temizle (PATCH'te overwrite)
  await fs.rm(assetDir, { recursive: true, force: true });
  await fs.mkdir(assetDir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });
  await fs.writeFile(inputPath, input.buffer);

  try {
    await encodeWebp(inputPath, largePath, LARGE_WIDTH);
    await encodeWebp(inputPath, mediumPath, MEDIUM_WIDTH);

    const largeStat = await fs.stat(largePath);
    const mediumStat = await fs.stat(mediumPath);

    return {
      imageRelPath: relPath("category-overlays", input.folder, "large.webp"),
      imageRelPathMedium: relPath("category-overlays", input.folder, "medium.webp"),
      bytes: largeStat.size + mediumStat.size,
    };
  } catch (err) {
    await fs.rm(assetDir, { recursive: true, force: true });
    throw err;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

export async function deleteOverlayFolder(folder: string): Promise<void> {
  const assetDir = path.join(config.storageDir, "category-overlays", folder);
  await fs.rm(assetDir, { recursive: true, force: true });
}

async function encodeWebp(inputPath: string, outputPath: string, maxWidth: number): Promise<void> {
  await runProcess(config.ffmpegPath, [
    "-y",
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-vf",
    `scale=w=min(${maxWidth}\\,iw):h=-2:force_original_aspect_ratio=decrease`,
    "-c:v",
    "libwebp",
    "-preset",
    "picture",
    "-q:v",
    String(WEBP_QUALITY),
    "-compression_level",
    "6",
    outputPath,
  ]);
}

function isImageBuffer(buffer: Buffer, contentType?: string): boolean {
  const ct = contentType?.split(";")[0]?.trim().toLowerCase();
  if (ct?.startsWith("image/")) return true;

  // Magic bytes — JPEG, PNG, WEBP, AVIF
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return true;
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return true;
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true;
  }
  if (buffer.subarray(4, 12).toString("ascii").includes("ftyp")) {
    return buffer.subarray(8, 16).toString("ascii").includes("avif");
  }
  return false;
}

function inferExtension(buffer: Buffer, contentType?: string, originalFilename?: string): string {
  const ct = contentType?.split(";")[0]?.trim().toLowerCase();
  if (ct === "image/jpeg") return "jpg";
  if (ct === "image/png") return "png";
  if (ct === "image/webp") return "webp";
  if (ct === "image/avif") return "avif";

  const ext = originalFilename ? path.extname(originalFilename).replace(".", "").toLowerCase() : "";
  if (/^[a-z0-9]{1,8}$/.test(ext)) return ext;

  // Fallback by magic
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "jpg";
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "png";
  return "bin";
}

/**
 * Göreli media path döndürür — örn. "/media/category-overlays/1/large.webp".
 * Origin (https://...) eklenmez; GET endpoint'inde dinamik olarak prefix'lenir,
 * böylece sunucu domain'i değişirse DB güncellenmesi gerekmez.
 */
function relPath(...segments: string[]): string {
  return "/media/" + segments.map((s) => encodeURIComponent(s)).join("/");
}

function appendLimited(current: string, next: Buffer, max = 24_000): string {
  const value = current + next.toString("utf8");
  return value.length > max ? value.slice(value.length - max) : value;
}

function runProcess(command: string, args: string[], timeoutMs = 60_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new ApiError(500, "media_processing_timeout", "Image processing timed out."));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        new ApiError(
          500,
          "media_processor_unavailable",
          `${command} could not be started: ${err.message}`,
        ),
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new ApiError(
          422,
          "media_processing_failed",
          `${command} exited with code ${code}. ${stderr || stdout}`.trim(),
        ),
      );
    });
  });
}
