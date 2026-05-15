import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  /** Prisma Migrate / CLI; runtime pool için `POSTGRES_DIRECT_URL` kullanılır (prisma+ URL ise zorunlu) */
  DATABASE_URL: z.string().min(1),
  /** `pg.Pool` için doğrudan `postgresql://...` (yoksa DATABASE_URL kullanılır) */
  POSTGRES_DIRECT_URL: z.string().optional(),
  /**
   * Token'dan userId'yi okumak için kullanılan claim key.
   * Varsayılan: "sub" — JWT standardı.
   */
  JWT_USER_ID_CLAIM: z.string().default("sub"),
  STORY_MEDIA_STORAGE_DIR: z.string().default("var/story-media"),
  STORY_MEDIA_TMP_DIR: z.string().default("var/story-media-tmp"),
  STORY_MEDIA_PUBLIC_BASE_URL: z.string().url().optional(),
  STORY_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(250 * 1024 * 1024),
  STORY_IMAGE_FORMAT: z.enum(["webp", "avif"]).default("webp"),
  STORY_IMAGE_QUALITY: z.coerce.number().int().min(1).max(100).default(90),
  STORY_IMAGE_MAX_WIDTH: z.coerce.number().int().min(320).max(4096).default(1080),
  STORY_THUMB_SIZE: z.coerce.number().int().min(96).max(1024).default(320),
  STORY_VIDEO_MAX_SECONDS: z.coerce.number().int().min(1).max(60).default(60),
  STORY_VIDEO_OVERFLOW_POLICY: z.enum(["reject", "trim"]).default("trim"),
  STORY_HLS_SEGMENT_SECONDS: z.coerce.number().int().min(1).max(6).default(2),
  STORY_HLS_PREVIEW_SECONDS: z.coerce.number().int().min(1).max(10).default(3),
  FFMPEG_PATH: z.string().default("ffmpeg"),
  FFPROBE_PATH: z.string().default("ffprobe"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}
