import { z } from "zod";

const iso = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid ISO 8601 date");

export const createStoryUploadParamsSchema = z.object({
  groupId: z.string().min(1),
});

export const createStoryUploadQuerySchema = z
  .object({
    mediaType: z.enum(["image", "video"]),
    order: z.coerce.number().int().min(0),
    expiresAt: iso,
    durationMs: z.coerce.number().int().min(1000).max(60_000).optional(),
    ctaType: z.enum(["product", "collection", "link", "design"]).optional(),
    ctaValue: z.string().min(1).optional(),
    ctaLabel: z.string().min(1).optional(),
    overflowPolicy: z.enum(["reject", "trim"]).optional(),
    imageFormat: z.enum(["webp", "avif"]).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasAnyCta = Boolean(value.ctaType || value.ctaValue || value.ctaLabel);
    const hasAllCta = Boolean(value.ctaType && value.ctaValue && value.ctaLabel);
    if (hasAnyCta && !hasAllCta) {
      ctx.addIssue({
        code: "custom",
        message: "ctaType, ctaValue, and ctaLabel must all be provided together",
        path: ["ctaType"],
      });
    }
  });

export type CreateStoryUploadParams = z.infer<typeof createStoryUploadParamsSchema>;
export type CreateStoryUploadQuery = z.infer<typeof createStoryUploadQuerySchema>;
