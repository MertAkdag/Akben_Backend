import path from "path";
import type { Request } from "express";
import { getEnv } from "./env";

export type StoryImageFormat = "webp" | "avif";
export type StoryVideoOverflowPolicy = "reject" | "trim";

export type StoryMediaRuntimeConfig = {
  storageDir: string;
  tmpDir: string;
  publicBaseUrl?: string;
  maxUploadBytes: number;
  imageFormat: StoryImageFormat;
  imageQuality: number;
  imageMaxWidth: number;
  thumbSize: number;
  videoMaxSeconds: number;
  videoOverflowPolicy: StoryVideoOverflowPolicy;
  hlsSegmentSeconds: number;
  hlsPreviewSeconds: number;
  ffmpegPath: string;
  ffprobePath: string;
};

function absolutePath(value: string): string {
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

export function getStoryMediaRuntimeConfig(): StoryMediaRuntimeConfig {
  const env = getEnv();
  return {
    storageDir: absolutePath(env.STORY_MEDIA_STORAGE_DIR),
    tmpDir: absolutePath(env.STORY_MEDIA_TMP_DIR),
    publicBaseUrl: env.STORY_MEDIA_PUBLIC_BASE_URL,
    maxUploadBytes: env.STORY_MAX_UPLOAD_BYTES,
    imageFormat: env.STORY_IMAGE_FORMAT,
    imageQuality: env.STORY_IMAGE_QUALITY,
    imageMaxWidth: env.STORY_IMAGE_MAX_WIDTH,
    thumbSize: env.STORY_THUMB_SIZE,
    videoMaxSeconds: env.STORY_VIDEO_MAX_SECONDS,
    videoOverflowPolicy: env.STORY_VIDEO_OVERFLOW_POLICY,
    hlsSegmentSeconds: env.STORY_HLS_SEGMENT_SECONDS,
    hlsPreviewSeconds: env.STORY_HLS_PREVIEW_SECONDS,
    ffmpegPath: env.FFMPEG_PATH,
    ffprobePath: env.FFPROBE_PATH,
  };
}

export function resolveStoryMediaPublicBaseUrl(req: Request): string {
  const configured = getStoryMediaRuntimeConfig().publicBaseUrl;
  if (configured) return configured.replace(/\/+$/, "");

  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.header("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");
  return `${protocol}://${host}/media`;
}
