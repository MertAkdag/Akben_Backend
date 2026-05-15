import { Router } from "express";
import { z } from "zod";
import { validateQuery, validateParams, validateBody } from "../../middlewares/validate.middleware";
import {
  adminListDeals,
  adminGetDeal,
  adminCreateDeal,
  adminUpdateDeal,
  adminUpdateDealStatus,
  adminDeleteDeal,
  adminDealAnalytics,
} from "./flash-deals.controller";

// ─── Zod Schemas ───

const adminListQuerySchema = z.object({
  status: z.enum(["scheduled", "active", "expired", "soldOut", "cancelled"]).optional(),
  type: z.enum(["daily", "flash", "weekend"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const dealIdParamsSchema = z.object({
  dealId: z.string().min(1),
});

const createFlashDealSchema = z
  .object({
    title: z.string().min(3).max(200),
    subtitle: z.string().max(200).optional(),
    description: z.string().max(2000).optional(),
    imageUrl: z.string().url(),
    imageUrls: z.array(z.string().url()).max(10).default([]),
    originalMilyem: z.number().positive().max(9999.99),
    dealMilyem: z.number().positive().max(9999.99),
    totalStock: z.number().int().min(1).max(9999),
    type: z.enum(["daily", "flash", "weekend"]).default("daily"),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    ctaLabel: z.string().max(50).default("Sepete Ekle"),
    ctaType: z.enum(["product", "link", "whatsapp"]).default("product"),
    ctaValue: z.string().max(500).optional(),
    productId: z.string().optional(),
    targetTier: z.string().optional(),
    priority: z.number().int().default(0),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: "endsAt must be after startsAt",
  })
  .refine((d) => d.dealMilyem < d.originalMilyem, {
    message: "dealMilyem must be less than originalMilyem",
  });

const updateFlashDealSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  subtitle: z.string().max(200).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
  originalMilyem: z.number().positive().max(9999.99).optional(),
  dealMilyem: z.number().positive().max(9999.99).optional(),
  totalStock: z.number().int().min(1).max(9999).optional(),
  remainingStock: z.number().int().min(0).optional(),
  type: z.enum(["daily", "flash", "weekend"]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  ctaLabel: z.string().max(50).optional(),
  ctaType: z.enum(["product", "link", "whatsapp"]).optional(),
  ctaValue: z.string().max(500).nullable().optional(),
  productId: z.string().nullable().optional(),
  targetTier: z.string().nullable().optional(),
  priority: z.number().int().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["scheduled", "active", "expired", "soldOut", "cancelled"]),
});

// ─── Router ───

export const adminFlashDealsRouter = Router();

// GET    /admin/flash-deals            — Listeleme (filtreli, paginated)
adminFlashDealsRouter.get(
  "/",
  validateQuery(adminListQuerySchema),
  adminListDeals,
);

// GET    /admin/flash-deals/:dealId    — Tekil detay
adminFlashDealsRouter.get(
  "/:dealId",
  validateParams(dealIdParamsSchema),
  adminGetDeal,
);

// POST   /admin/flash-deals            — Yeni oluştur
adminFlashDealsRouter.post(
  "/",
  validateBody(createFlashDealSchema),
  adminCreateDeal,
);

// PUT    /admin/flash-deals/:dealId    — Güncelle
adminFlashDealsRouter.put(
  "/:dealId",
  validateParams(dealIdParamsSchema),
  validateBody(updateFlashDealSchema),
  adminUpdateDeal,
);

// PATCH  /admin/flash-deals/:dealId/status — Durum değiştir
adminFlashDealsRouter.patch(
  "/:dealId/status",
  validateParams(dealIdParamsSchema),
  validateBody(updateStatusSchema),
  adminUpdateDealStatus,
);

// DELETE /admin/flash-deals/:dealId    — Soft delete
adminFlashDealsRouter.delete(
  "/:dealId",
  validateParams(dealIdParamsSchema),
  adminDeleteDeal,
);

// GET    /admin/flash-deals/:dealId/analytics — İstatistikler
adminFlashDealsRouter.get(
  "/:dealId/analytics",
  validateParams(dealIdParamsSchema),
  adminDealAnalytics,
);
