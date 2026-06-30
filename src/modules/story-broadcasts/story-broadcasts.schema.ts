import { z } from "zod";

const iso = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Geçersiz ISO 8601 tarihi");

// V1 kanalları: inapp + instagram. (whatsapp sonraki faz.)
const channelEnum = z.enum(["inapp", "instagram"]);

/**
 * Hedef kanallar virgülle ayrık string olarak gelir ("inapp,instagram").
 * Boşsa varsayılan sadece "inapp".
 */
const channelsSchema = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "inapp")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(z.array(channelEnum).min(1, "En az bir kanal gerekli"));

/**
 * POST /admin/story-broadcasts — raw medya gövdesi + query metadata.
 * Mevcut stories admin upload deseniyle aynı: medya raw body, ayarlar query'de.
 */
export const createBroadcastQuerySchema = z
  .object({
    mediaType: z.enum(["image", "video"]),
    channels: channelsSchema,
    expiresAt: iso, // in-app story TTL
    scheduledAt: iso.optional(), // ileri tarihli yayın; yoksa hemen
    durationMs: z.coerce.number().int().min(1000).max(60_000).optional(),
    caption: z.string().max(2200).optional(),
    groupName: z.string().min(1).max(120).optional(), // yoksa env STORY_BRAND_NAME
    groupAvatarUrl: z.string().url().max(2000).optional(), // yoksa env STORY_BRAND_AVATAR_URL
    ctaType: z.enum(["product", "collection", "link", "design"]).optional(),
    ctaValue: z.string().min(1).optional(),
    ctaLabel: z.string().min(1).optional(),
    overflowPolicy: z.enum(["reject", "trim"]).optional(),
    imageFormat: z.enum(["webp", "avif"]).optional(),
  })
  .superRefine((value, ctx) => {
    const hasAnyCta = Boolean(value.ctaType || value.ctaValue || value.ctaLabel);
    const hasAllCta = Boolean(value.ctaType && value.ctaValue && value.ctaLabel);
    if (hasAnyCta && !hasAllCta) {
      ctx.addIssue({
        code: "custom",
        message: "ctaType, ctaValue ve ctaLabel birlikte verilmeli",
        path: ["ctaType"],
      });
    }
    if (value.scheduledAt && Date.parse(value.scheduledAt) >= Date.parse(value.expiresAt)) {
      ctx.addIssue({
        code: "custom",
        message: "scheduledAt, expiresAt'ten önce olmalı",
        path: ["scheduledAt"],
      });
    }
  });

export const listBroadcastsQuerySchema = z.object({
  status: z.enum(["scheduled", "processing", "partial", "completed", "failed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const broadcastIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type CreateBroadcastQuery = z.infer<typeof createBroadcastQuerySchema>;
export type ListBroadcastsQuery = z.infer<typeof listBroadcastsQuerySchema>;
export type BroadcastIdParams = z.infer<typeof broadcastIdParamsSchema>;
