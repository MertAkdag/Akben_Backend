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

  // ─── Admin paneli (Akben_Admin) ───
  // Ayarlanırsa bu klasördeki statik SPA build'i (dist/) backend tarafından servis edilir.
  // SPA + API aynı origin → CORS yok, panelde göreli /v1 kullanılır. Boşsa panel servis edilmez.
  ADMIN_DIST_DIR: z.string().optional(),

  // ─── Story Broadcast: in-app grup kimliği (her broadcast kendi grubunu oluşturur) ───
  STORY_BRAND_NAME: z.string().default("Akben"),
  STORY_BRAND_AVATAR_URL: z.string().default(""),

  // ─── Story Broadcast: worker ───
  // Job kuyruğunu tarama aralığı (ms). flash-deals cron deseniyle aynı setInterval mantığı.
  STORY_BROADCAST_WORKER_INTERVAL_MS: z.coerce.number().int().min(1000).default(15_000),
  // Bir tick'te işlenecek maksimum job (rate limit / yük koruması).
  STORY_BROADCAST_WORKER_BATCH: z.coerce.number().int().min(1).max(50).default(5),
  // Retry backoff taban saniyesi: bekleme = base * 2^(attempt-1).
  STORY_BROADCAST_RETRY_BASE_SECONDS: z.coerce.number().int().min(1).default(30),

  // ─── Instagram Graph API (content publishing) ───
  // Boşsa instagram kanalı "skipped" işaretlenir — kod hazır, creds gelince aktifleşir.
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),
  INSTAGRAM_GRAPH_VERSION: z.string().default("v21.0"),
  // Video container işleme polling'i (IG video'yu sunucu tarafında işler).
  INSTAGRAM_PUBLISH_POLL_TIMEOUT_MS: z.coerce.number().int().min(5000).default(120_000),
  INSTAGRAM_PUBLISH_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(3000),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}
