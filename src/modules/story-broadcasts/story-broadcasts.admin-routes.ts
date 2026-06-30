import express, { Router } from "express";
import { z } from "zod";
import {
  validateParams,
  validateQuery,
} from "../../middlewares/validate.middleware";
import { getStoryMediaRuntimeConfig } from "../../config/storyMedia";
import { ApiError } from "../../utils/apiError";
import {
  broadcastIdParamsSchema,
  createBroadcastQuerySchema,
  listBroadcastsQuerySchema,
} from "./story-broadcasts.schema";
import {
  createStoryBroadcast,
  getStoryBroadcast,
  listStoryBroadcasts,
  retryStoryBroadcast,
} from "./story-broadcasts.controller";

const rawUploadBodySchema = z.custom<Buffer>(
  (value) => Buffer.isBuffer(value) && value.length > 0,
  { message: "Yayın gövdesi ham medya baytı olmalı." },
);

const rawUploadBodyValidator = (
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
) => {
  const parsed = rawUploadBodySchema.safeParse(req.body);
  if (!parsed.success) {
    next(
      new ApiError(
        400,
        "missing_binary_body",
        parsed.error.issues.map((issue) => issue.message).join(", "),
      ),
    );
    return;
  }
  next();
};

const { maxUploadBytes } = getStoryMediaRuntimeConfig();

export const adminStoryBroadcastsRouter = Router();

// POST /admin/story-broadcasts — raw medya yükle, işle, çok-kanallı yayına al
adminStoryBroadcastsRouter.post(
  "/",
  express.raw({
    type: ["image/*", "video/*", "application/octet-stream"],
    limit: maxUploadBytes,
  }),
  validateQuery(createBroadcastQuerySchema),
  rawUploadBodyValidator,
  createStoryBroadcast,
);

// GET /admin/story-broadcasts — yayın geçmişi (kanal durumlarıyla)
adminStoryBroadcastsRouter.get(
  "/",
  validateQuery(listBroadcastsQuerySchema),
  listStoryBroadcasts,
);

// GET /admin/story-broadcasts/:id — tekil yayın detayı
adminStoryBroadcastsRouter.get(
  "/:id",
  validateParams(broadcastIdParamsSchema),
  getStoryBroadcast,
);

// POST /admin/story-broadcasts/:id/retry — başarısız kanalları yeniden dene
adminStoryBroadcastsRouter.post(
  "/:id/retry",
  validateParams(broadcastIdParamsSchema),
  retryStoryBroadcast,
);
