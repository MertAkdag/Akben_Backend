import { spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { ApiError } from "../../utils/apiError";
import type {
  StoryImageFormat,
  StoryMediaRuntimeConfig,
  StoryVideoOverflowPolicy,
} from "../../config/storyMedia";
import { getStoryMediaRuntimeConfig } from "../../config/storyMedia";

export type StoryUploadMediaType = "image" | "video";

export type ProcessStoryMediaInput = {
  buffer: Buffer;
  expectedMediaType: StoryUploadMediaType;
  contentType?: string;
  originalFilename?: string;
  publicBaseUrl: string;
  imageFormat?: StoryImageFormat;
  videoOverflowPolicy?: StoryVideoOverflowPolicy;
  /**
   * true ise Instagram-uyumlu bir rendition da üretir:
   * image → JPEG (ig.jpg), video → tek parça H.264/AAC MP4 (ig.mp4).
   * Instagram Graph API HLS/webp/avif kabul etmez, public bir JPEG/MP4 URL'i ister.
   */
  instagramRendition?: boolean;
};

export type ProcessedStoryMedia = {
  assetId: string;
  mediaUrl: string;
  thumbnailUrl: string;
  posterUrl: string | null;
  hlsManifestUrl: string | null;
  hlsPreviewSegmentUrls: string[];
  optimizedFormat: string;
  durationMs: number;
  mediaBytes: number;
  mediaWidth: number | null;
  mediaHeight: number | null;
  /** Instagram-uyumlu rendition URL'i (instagramRendition=true ise dolu, aksi halde null). */
  igMediaUrl: string | null;
};

type FfprobeStream = {
  codec_type?: string;
  width?: number;
  height?: number;
};

type FfprobeJson = {
  streams?: FfprobeStream[];
  format?: { duration?: string };
};

type HlsVariant = {
  index: number;
  width: number;
  videoBitrate: string;
  maxRate: string;
  bufferSize: string;
  audioBitrate: string;
};

const HLS_VARIANTS: HlsVariant[] = [
  { index: 0, width: 540, videoBitrate: "850k", maxRate: "1050k", bufferSize: "1700k", audioBitrate: "96k" },
  { index: 1, width: 720, videoBitrate: "1800k", maxRate: "2200k", bufferSize: "3600k", audioBitrate: "128k" },
  { index: 2, width: 1080, videoBitrate: "3200k", maxRate: "3900k", bufferSize: "6400k", audioBitrate: "160k" },
];

export class StoryMediaProcessor {
  constructor(private readonly config: StoryMediaRuntimeConfig = getStoryMediaRuntimeConfig()) {}

  async process(input: ProcessStoryMediaInput): Promise<ProcessedStoryMedia> {
    const detectedType = detectMediaType(input.buffer, input.contentType);
    if (detectedType && detectedType !== input.expectedMediaType) {
      throw new ApiError(
        415,
        "media_type_mismatch",
        `Uploaded file is ${detectedType}, but ${input.expectedMediaType} was declared.`,
      );
    }

    const assetId = randomUUID();
    const assetDir = path.join(this.config.storageDir, assetId);
    const tmpDir = path.join(this.config.tmpDir, assetId);
    const originalExt = inferExtension(input.buffer, input.contentType, input.originalFilename);
    const originalPath = path.join(tmpDir, `upload.${originalExt}`);

    await fs.mkdir(assetDir, { recursive: true });
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(originalPath, input.buffer);

    try {
      if (input.expectedMediaType === "image") {
        return await this.processImage({
          assetId,
          assetDir,
          originalPath,
          publicBaseUrl: input.publicBaseUrl,
          imageFormat: input.imageFormat ?? this.config.imageFormat,
          instagramRendition: input.instagramRendition ?? false,
        });
      }

      return await this.processVideo({
        assetId,
        assetDir,
        originalPath,
        publicBaseUrl: input.publicBaseUrl,
        overflowPolicy: input.videoOverflowPolicy ?? this.config.videoOverflowPolicy,
        instagramRendition: input.instagramRendition ?? false,
      });
    } catch (err) {
      await fs.rm(assetDir, { recursive: true, force: true });
      throw err;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  }

  private async processImage(params: {
    assetId: string;
    assetDir: string;
    originalPath: string;
    publicBaseUrl: string;
    imageFormat: StoryImageFormat;
    instagramRendition: boolean;
  }): Promise<ProcessedStoryMedia> {
    const { assetId, assetDir, originalPath, publicBaseUrl, imageFormat, instagramRendition } = params;
    const outputFilename = `image.${imageFormat}`;
    const outputPath = path.join(assetDir, outputFilename);
    const thumbnailPath = path.join(assetDir, "thumb.webp");

    const imageArgs =
      imageFormat === "avif"
        ? [
            "-frames:v",
            "1",
            "-vf",
            `scale=w=min(${this.config.imageMaxWidth}\\,iw):h=-2:force_original_aspect_ratio=decrease`,
            "-c:v",
            "libaom-av1",
            "-crf",
            String(Math.max(12, 35 - Math.round(this.config.imageQuality / 5))),
            "-cpu-used",
            "4",
            "-still-picture",
            "1",
          ]
        : [
            "-frames:v",
            "1",
            "-vf",
            `scale=w=min(${this.config.imageMaxWidth}\\,iw):h=-2:force_original_aspect_ratio=decrease`,
            "-c:v",
            "libwebp",
            "-preset",
            "picture",
            "-q:v",
            String(this.config.imageQuality),
            "-compression_level",
            "6",
          ];

    await runProcess(this.config.ffmpegPath, ["-y", "-i", originalPath, ...imageArgs, outputPath]);
    await runProcess(this.config.ffmpegPath, [
      "-y",
      "-i",
      originalPath,
      "-frames:v",
      "1",
      "-vf",
      `scale=${this.config.thumbSize}:${this.config.thumbSize}:force_original_aspect_ratio=increase,crop=${this.config.thumbSize}:${this.config.thumbSize}`,
      "-c:v",
      "libwebp",
      "-q:v",
      "82",
      "-compression_level",
      "6",
      thumbnailPath,
    ]);

    // Instagram-uyumlu JPEG rendition (webp/avif IG'de yayınlanamaz).
    let igMediaUrl: string | null = null;
    if (instagramRendition) {
      const igPath = path.join(assetDir, "ig.jpg");
      await runProcess(this.config.ffmpegPath, [
        "-y",
        "-i",
        originalPath,
        "-frames:v",
        "1",
        "-vf",
        `scale=w=min(${this.config.imageMaxWidth}\\,iw):h=-2:force_original_aspect_ratio=decrease`,
        "-c:v",
        "mjpeg",
        "-q:v",
        "3",
        igPath,
      ]);
      igMediaUrl = publicUrl(publicBaseUrl, assetId, "ig.jpg");
    }

    const probe = await this.probe(originalPath);
    const videoStream = probe.streams?.find((s) => s.codec_type === "video");
    const mediaBytes = await fileSize(outputPath);

    return {
      assetId,
      mediaUrl: publicUrl(publicBaseUrl, assetId, outputFilename),
      thumbnailUrl: publicUrl(publicBaseUrl, assetId, "thumb.webp"),
      posterUrl: null,
      hlsManifestUrl: null,
      hlsPreviewSegmentUrls: [],
      optimizedFormat: imageFormat,
      durationMs: 5000,
      mediaBytes,
      mediaWidth: videoStream?.width ?? null,
      mediaHeight: videoStream?.height ?? null,
      igMediaUrl,
    };
  }

  private async processVideo(params: {
    assetId: string;
    assetDir: string;
    originalPath: string;
    publicBaseUrl: string;
    overflowPolicy: StoryVideoOverflowPolicy;
    instagramRendition: boolean;
  }): Promise<ProcessedStoryMedia> {
    const { assetId, assetDir, originalPath, publicBaseUrl, overflowPolicy, instagramRendition } = params;
    const probe = await this.probe(originalPath);
    const durationSeconds = Number(probe.format?.duration ?? 0);
    const videoStream = probe.streams?.find((s) => s.codec_type === "video");
    const hasAudio = Boolean(probe.streams?.some((s) => s.codec_type === "audio"));

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new ApiError(422, "invalid_video_duration", "Video duration could not be read.");
    }

    if (durationSeconds > this.config.videoMaxSeconds && overflowPolicy === "reject") {
      throw new ApiError(
        422,
        "video_duration_exceeded",
        `Story videos must be ${this.config.videoMaxSeconds} seconds or shorter.`,
      );
    }

    const cappedDurationSeconds = Math.min(durationSeconds, this.config.videoMaxSeconds);
    const posterPath = path.join(assetDir, "poster.webp");
    const thumbnailPath = path.join(assetDir, "thumb.webp");
    const hlsDir = path.join(assetDir, "hls");
    await fs.mkdir(hlsDir, { recursive: true });
    await Promise.all(
      HLS_VARIANTS.map((variant) => fs.mkdir(path.join(hlsDir, `v${variant.index}`), { recursive: true })),
    );

    await runProcess(this.config.ffmpegPath, [
      "-y",
      "-ss",
      "0.1",
      "-i",
      originalPath,
      "-frames:v",
      "1",
      "-vf",
      `scale=w=min(${this.config.imageMaxWidth}\\,iw):h=-2:force_original_aspect_ratio=decrease`,
      "-c:v",
      "libwebp",
      "-q:v",
      "86",
      "-compression_level",
      "6",
      posterPath,
    ]);

    await runProcess(this.config.ffmpegPath, [
      "-y",
      "-ss",
      "0.1",
      "-i",
      originalPath,
      "-frames:v",
      "1",
      "-vf",
      `scale=${this.config.thumbSize}:${this.config.thumbSize}:force_original_aspect_ratio=increase,crop=${this.config.thumbSize}:${this.config.thumbSize}`,
      "-c:v",
      "libwebp",
      "-q:v",
      "82",
      "-compression_level",
      "6",
      thumbnailPath,
    ]);

    await this.transcodeHls({
      inputPath: originalPath,
      hlsDir,
      hasAudio,
      durationWasCapped: durationSeconds > this.config.videoMaxSeconds,
    });

    const hlsPreviewSegmentUrls = await this.collectHlsPreviewSegmentUrls({
      assetId,
      hlsDir,
      publicBaseUrl,
    });

    // Instagram-uyumlu tek parça MP4 (H.264/AAC). IG HLS kabul etmez; public MP4 URL'i ister.
    let igMediaUrl: string | null = null;
    if (instagramRendition) {
      const igPath = path.join(assetDir, "ig.mp4");
      const capArgs = durationSeconds > this.config.videoMaxSeconds ? ["-t", String(this.config.videoMaxSeconds)] : [];
      const audioArgs = hasAudio
        ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "48000"]
        : ["-an"];
      await runProcess(
        this.config.ffmpegPath,
        [
          "-y",
          "-i",
          originalPath,
          ...capArgs,
          "-vf",
          `scale=w=min(${this.config.imageMaxWidth}\\,iw):h=-2:force_original_aspect_ratio=decrease`,
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-profile:v",
          "main",
          "-pix_fmt",
          "yuv420p",
          "-b:v",
          "3500k",
          "-maxrate",
          "4000k",
          "-bufsize",
          "7000k",
          ...audioArgs,
          "-movflags",
          "+faststart",
          igPath,
        ],
        10 * 60_000,
      );
      igMediaUrl = publicUrl(publicBaseUrl, assetId, "ig.mp4");
    }

    return {
      assetId,
      mediaUrl: publicUrl(publicBaseUrl, assetId, "hls", "master.m3u8"),
      thumbnailUrl: publicUrl(publicBaseUrl, assetId, "thumb.webp"),
      posterUrl: publicUrl(publicBaseUrl, assetId, "poster.webp"),
      hlsManifestUrl: publicUrl(publicBaseUrl, assetId, "hls", "master.m3u8"),
      hlsPreviewSegmentUrls,
      optimizedFormat: "hls",
      durationMs: Math.round(cappedDurationSeconds * 1000),
      mediaBytes: await directorySize(assetDir),
      mediaWidth: videoStream?.width ?? null,
      mediaHeight: videoStream?.height ?? null,
      igMediaUrl,
    };
  }

  private async transcodeHls(params: {
    inputPath: string;
    hlsDir: string;
    hasAudio: boolean;
    durationWasCapped: boolean;
  }): Promise<void> {
    const splitLabels = HLS_VARIANTS.map((variant) => `[v${variant.index}]`).join("");
    const scaleFilters = HLS_VARIANTS.map(
      (variant) =>
        `[v${variant.index}]scale=w=min(${variant.width}\\,iw):h=-2:force_original_aspect_ratio=decrease[v${variant.index}out]`,
    ).join(";");

    const args = [
      "-y",
      "-i",
      params.inputPath,
      ...(params.durationWasCapped ? ["-t", String(this.config.videoMaxSeconds)] : []),
      "-filter_complex",
      `[0:v]split=${HLS_VARIANTS.length}${splitLabels};${scaleFilters}`,
    ];

    for (const variant of HLS_VARIANTS) {
      args.push("-map", `[v${variant.index}out]`);
      if (params.hasAudio) args.push("-map", "0:a:0");
    }

    for (const variant of HLS_VARIANTS) {
      args.push(
        `-c:v:${variant.index}`,
        "libx264",
        `-b:v:${variant.index}`,
        variant.videoBitrate,
        `-maxrate:v:${variant.index}`,
        variant.maxRate,
        `-bufsize:v:${variant.index}`,
        variant.bufferSize,
        `-profile:v:${variant.index}`,
        "main",
      );
      if (params.hasAudio) {
        args.push(
          `-c:a:${variant.index}`,
          "aac",
          `-b:a:${variant.index}`,
          variant.audioBitrate,
          `-ac:a:${variant.index}`,
          "2",
          `-ar:a:${variant.index}`,
          "48000",
        );
      }
    }

    args.push(
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-sc_threshold",
      "0",
      "-g",
      String(this.config.hlsSegmentSeconds * 30),
      "-keyint_min",
      String(this.config.hlsSegmentSeconds * 30),
      "-force_key_frames",
      `expr:gte(t,n_forced*${this.config.hlsSegmentSeconds})`,
      "-f",
      "hls",
      "-hls_time",
      String(this.config.hlsSegmentSeconds),
      "-hls_playlist_type",
      "vod",
      "-hls_flags",
      "independent_segments",
      "-master_pl_name",
      "master.m3u8",
      "-hls_segment_filename",
      path.join(params.hlsDir, "v%v", "seg_%05d.ts"),
      "-var_stream_map",
      HLS_VARIANTS.map((variant) =>
        params.hasAudio ? `v:${variant.index},a:${variant.index}` : `v:${variant.index}`,
      ).join(" "),
      path.join(params.hlsDir, "v%v", "index.m3u8"),
    );

    await runProcess(this.config.ffmpegPath, args, 10 * 60_000);
  }

  private async collectHlsPreviewSegmentUrls(params: {
    assetId: string;
    hlsDir: string;
    publicBaseUrl: string;
  }): Promise<string[]> {
    const urls: string[] = [];
    for (const variant of HLS_VARIANTS) {
      const playlistPath = path.join(params.hlsDir, `v${variant.index}`, "index.m3u8");
      const playlist = await fs.readFile(playlistPath, "utf8");
      const playlistUrl = publicUrl(params.publicBaseUrl, params.assetId, "hls", `v${variant.index}`, "index.m3u8");
      urls.push(...extractPreviewSegmentUrls(playlist, playlistUrl, this.config.hlsPreviewSeconds));
    }
    return [...new Set(urls)];
  }

  private async probe(inputPath: string): Promise<FfprobeJson> {
    const stdout = await runProcessCapture(this.config.ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-show_entries",
      "stream=codec_type,width,height",
      "-of",
      "json",
      inputPath,
    ]);

    try {
      return JSON.parse(stdout) as FfprobeJson;
    } catch {
      throw new ApiError(422, "media_probe_failed", "Media metadata could not be parsed.");
    }
  }
}

export const storyMediaProcessor = new StoryMediaProcessor();

function detectMediaType(buffer: Buffer, contentType?: string): StoryUploadMediaType | null {
  const normalizedContentType = contentType?.split(";")[0]?.trim().toLowerCase();
  if (normalizedContentType?.startsWith("image/")) return "image";
  if (normalizedContentType?.startsWith("video/")) return "video";

  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image";
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image";
  }
  if (buffer.subarray(4, 12).toString("ascii").includes("ftyp")) {
    const brand = buffer.subarray(8, 16).toString("ascii");
    if (brand.includes("avif")) return "image";
    return "video";
  }
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return "video";

  return null;
}

function inferExtension(buffer: Buffer, contentType?: string, originalFilename?: string): string {
  const normalizedContentType = contentType?.split(";")[0]?.trim().toLowerCase();
  if (normalizedContentType === "image/jpeg") return "jpg";
  if (normalizedContentType === "image/png") return "png";
  if (normalizedContentType === "image/webp") return "webp";
  if (normalizedContentType === "image/avif") return "avif";
  if (normalizedContentType === "video/mp4") return "mp4";
  if (normalizedContentType === "video/quicktime") return "mov";
  if (normalizedContentType === "video/webm") return "webm";

  const extension = originalFilename ? path.extname(originalFilename).replace(".", "").toLowerCase() : "";
  if (/^[a-z0-9]{1,8}$/.test(extension)) return extension;

  const detectedType = detectMediaType(buffer, contentType);
  return detectedType === "image" ? "jpg" : "mp4";
}

function publicUrl(baseUrl: string, ...segments: string[]): string {
  const base = baseUrl.replace(/\/+$/, "");
  return [base, ...segments.map((segment) => encodeURIComponent(segment))].join("/");
}

function extractPreviewSegmentUrls(playlist: string, playlistUrl: string, previewSeconds: number): string[] {
  const lines = playlist.split(/\r?\n/);
  const urls: string[] = [];
  let totalSeconds = 0;
  let pendingDuration = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      pendingDuration = Number(line.slice("#EXTINF:".length).split(",")[0]) || 0;
      continue;
    }

    if (line.startsWith("#")) continue;
    if (totalSeconds >= previewSeconds) break;

    urls.push(new URL(line, playlistUrl).toString());
    totalSeconds += pendingDuration || 2;
    pendingDuration = 0;
  }

  return urls;
}

async function fileSize(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  return stat.size;
}

async function directorySize(directory: string): Promise<number> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(fullPath);
    } else {
      total += await fileSize(fullPath);
    }
  }
  return total;
}

function appendLimited(current: string, next: Buffer, max = 24_000): string {
  const value = current + next.toString("utf8");
  return value.length > max ? value.slice(value.length - max) : value;
}

function runProcess(command: string, args: string[], timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new ApiError(500, "media_processing_timeout", "Media processing timed out."));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new ApiError(500, "media_processor_unavailable", `${command} could not be started: ${err.message}`));
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

function runProcessCapture(command: string, args: string[], timeoutMs = 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new ApiError(500, "media_probe_timeout", "Media probe timed out."));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, chunk, 100_000);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, chunk);
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new ApiError(500, "media_processor_unavailable", `${command} could not be started: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new ApiError(422, "media_probe_failed", `${command} exited with code ${code}. ${stderr}`.trim()));
    });
  });
}
