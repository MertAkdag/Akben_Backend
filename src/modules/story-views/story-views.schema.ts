import { z } from "zod";

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Geçersiz ISO 8601 tarihi");

/**
 * Tekil story view item validasyonu.
 * Dokümantasyondaki StoryView modeline uygun.
 * .strict() ile tanımlanmamış alanlar reddedilir.
 */
export const storyViewItemSchema = z
  .object({
    storyId: z.string().min(1),
    seenAt: iso,
    completed: z.boolean(),
    ctaClicked: z.boolean(),
    ctaClickedAt: iso.nullable(),
    platform: z.enum(["ios", "android", "web"]),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (!val.ctaClicked && val.ctaClickedAt !== null) {
      ctx.addIssue({
        code: "custom",
        message: "ctaClicked false iken ctaClickedAt null olmalı",
        path: ["ctaClickedAt"],
      });
    }
    if (val.ctaClicked && val.ctaClickedAt === null) {
      ctx.addIssue({
        code: "custom",
        message: "ctaClicked true iken ctaClickedAt zorunlu",
        path: ["ctaClickedAt"],
      });
    }
  });

/**
 * POST /story-views/batch — Body validation.
 * Dokümantasyon: views dizisi max 50 öğe.
 */
export const batchViewsBodySchema = z
  .object({
    views: z.array(storyViewItemSchema).min(1).max(50),
  })
  .strict();

export type StoryViewItemInput = z.infer<typeof storyViewItemSchema>;
export type BatchViewsBody = z.infer<typeof batchViewsBodySchema>;
