import express, { Router } from "express";
import { z } from "zod";
import { validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { getStoryMediaRuntimeConfig } from "../../config/storyMedia";
import { createStoryUpload } from "./stories.controller";
import { ApiError } from "../../utils/apiError";
import {
  createStoryUploadParamsSchema,
  createStoryUploadQuerySchema,
} from "./stories.admin.schema";

const rawUploadBodySchema = z.custom<Buffer>((value) => Buffer.isBuffer(value) && value.length > 0, {
  message: "Story upload body must be raw media bytes.",
});

const rawUploadBodyValidator = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  const parsed = rawUploadBodySchema.safeParse(req.body);
  if (!parsed.success) {
    next(new ApiError(400, "missing_binary_body", parsed.error.issues.map((issue) => issue.message).join(", ")));
    return;
  }
  next();
};

const { maxUploadBytes } = getStoryMediaRuntimeConfig();

export const adminStoriesRouter = Router();

adminStoriesRouter.post(
  "/story-groups/:groupId/stories",
  express.raw({
    type: ["image/*", "video/*", "application/octet-stream"],
    limit: maxUploadBytes,
  }),
  validateParams(createStoryUploadParamsSchema),
  validateQuery(createStoryUploadQuerySchema),
  rawUploadBodyValidator,
  createStoryUpload,
);
