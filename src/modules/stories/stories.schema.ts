import { z } from "zod";

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Geçersiz ISO 8601 tarihi");

/**
 * PATCH /stories/:storyId/seen — Body validation.
 *
 * Dokümantasyon:
 * - seenAt:       string (ISO 8601) — Zorunlu
 * - completed:    boolean — Zorunlu
 * - ctaClicked:   boolean — Zorunlu
 * - ctaClickedAt: string | null — Zorunlu (ctaClicked false ise null olmalı)
 * - platform:     enum — Zorunlu
 *
 * .strict() ile tanımlanmamış alanlar reddedilir.
 */
export const patchSeenBodySchema = z
  .object({
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

export type PatchSeenBody = z.infer<typeof patchSeenBodySchema>;
