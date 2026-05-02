import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { postBatchViews } from "./story-views.controller";
import { batchViewsBodySchema } from "./story-views.schema";
import { ApiError } from "../../utils/apiError";

const batchWriteLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const validateBatchBody: RequestHandler = (req, _res, next) => {
  const r = batchViewsBodySchema.safeParse(req.body);
  if (!r.success) {
    const batchLimit = r.error.issues.some(
      (i) =>
        i.path[0] === "views" &&
        (i.code === "too_big" || String(i.code) === "too_big"),
    );
    if (batchLimit) {
      next(new ApiError(422, "batch_limit_exceeded", "Maximum 50 views per batch"));
      return;
    }
    const msg = r.error.issues.map((i) => i.message).join(", ");
    next(new ApiError(422, "validation_error", msg));
    return;
  }
  req.body = r.data;
  next();
};

export const storyViewsRouter = Router();

storyViewsRouter.post("/batch", batchWriteLimiter, validateBatchBody, postBatchViews);
