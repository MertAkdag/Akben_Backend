/**
 * Catalog Overlay Admin Controller
 *
 * Görsel ve metadata yönetim endpoint'leri.
 *
 * NOT: Admin yetki kontrolü henüz yok. App.ts'de jwtAuth ile korumalı.
 * İleride adminAuth middleware eklenince bu router taşınmalı.
 *
 * Endpoint'ler:
 *   POST   /v1/catalog/overlays/:categoryId/image     → görsel yükle (raw binary)
 *   PATCH  /v1/catalog/overlays/:categoryId           → metadata güncelle (JSON)
 *   DELETE /v1/catalog/overlays/:categoryId           → kaydı + dosyaları sil
 *   GET    /v1/catalog/overlays/admin/missing         → overlay'i olmayan kategoriler
 */

import express, { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { getStoryMediaRuntimeConfig } from "../../config/storyMedia";
import { absolutizeOverlayUrl } from "./catalog-overlay.url";
import { ApiError } from "../../utils/apiError";
import { deleteOverlayFolder, processOverlayImage } from "./catalog-overlay.processor";

const { maxUploadBytes } = getStoryMediaRuntimeConfig();

const router = Router();

// ─── Schemas ───

const categoryIdParam = z.coerce.number().int().positive();

const upsertMetadataSchema = z
  .object({
    bannerTitle: z.string().max(120).nullable().optional(),
    bannerSubtitle: z.string().max(240).nullable().optional(),
    displayOrder: z.number().int().min(0).max(1000).optional(),
    featured: z.boolean().optional(),
    ctaLabel: z.string().max(40).nullable().optional(),
    ctaStyle: z.enum(["primary", "outline"]).nullable().optional(),
    aspectRatio: z.enum(["3:4", "1:1", "4:5", "16:9"]).nullable().optional(),
  })
  .strict();

// ─── POST /:categoryId/image — görsel yükle ───

router.post(
  "/:categoryId/image",
  express.raw({
    type: ["image/*", "application/octet-stream"],
    limit: maxUploadBytes,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryId = categoryIdParam.parse(req.params.categoryId);
      const buffer = req.body as Buffer;

      if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw new ApiError(
          400,
          "missing_binary_body",
          "Request body must contain raw image bytes. Set Content-Type to image/jpeg (or other image type).",
        );
      }

      const folder = String(categoryId);

      const processed = await processOverlayImage({
        buffer,
        contentType: req.header("content-type") ?? undefined,
        folder,
      });

      // Mevcut overlay'i bul veya yarat
      const existing = await prisma.categoryOverlay.findUnique({
        where: { categoryId },
      });

      const saved = existing
        ? await prisma.categoryOverlay.update({
            where: { categoryId },
            data: { imageUrl: processed.imageRelPath },
          })
        : await prisma.categoryOverlay.create({
            data: {
              categoryId,
              imageUrl: processed.imageRelPath,
            },
          });

      res.json({
        success: true,
        data: {
          ...saved,
          imageUrl: absolutizeOverlayUrl(req, saved.imageUrl),
          imageUrlMedium: absolutizeOverlayUrl(req, processed.imageRelPathMedium),
          bytes: processed.bytes,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /:categoryId — metadata güncelle ───

router.patch(
  "/:categoryId",
  express.json(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categoryId = categoryIdParam.parse(req.params.categoryId);
      const data = upsertMetadataSchema.parse(req.body);

      const existing = await prisma.categoryOverlay.findUnique({
        where: { categoryId },
      });

      const saved = existing
        ? await prisma.categoryOverlay.update({ where: { categoryId }, data })
        : await prisma.categoryOverlay.create({ data: { categoryId, ...data } });

      res.json({
        success: true,
        data: { ...saved, imageUrl: absolutizeOverlayUrl(req, saved.imageUrl) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /:categoryId — kaydı + dosyaları sil ───

router.delete("/:categoryId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = categoryIdParam.parse(req.params.categoryId);

    await prisma.categoryOverlay.deleteMany({ where: { categoryId } });
    await deleteOverlayFolder(String(categoryId));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/missing — yardım endpoint'i ───
// Hangi categoryId'lerin overlay'i yok? Frontend'den ERP listesi ile karşılaştırılır.

router.get("/admin/missing", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.categoryOverlay.findMany({
      select: { categoryId: true },
    });
    res.json({
      success: true,
      data: { existingCategoryIds: existing.map((o) => o.categoryId) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
