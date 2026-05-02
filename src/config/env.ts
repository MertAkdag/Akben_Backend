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
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}
