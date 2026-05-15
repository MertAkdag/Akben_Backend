import { Router } from "express";
import { z } from "zod";
import { validateQuery, validateParams, validateBody } from "../../middlewares/validate.middleware";
import {
  listActiveDeals,
  listUpcomingDeals,
  getDeal,
  interactWithDeal,
} from "./flash-deals.controller";

// ─── Zod Schemas ───

const activeQuerySchema = z.object({
  type: z.enum(["daily", "flash", "weekend"]).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const upcomingQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

const dealIdParamsSchema = z.object({
  dealId: z.string().min(1),
});

const interactBodySchema = z.object({
  type: z.enum(["impression", "click", "claim", "share"]),
  platform: z.enum(["ios", "android", "web"]),
});

// ─── Router ───

export const flashDealsRouter = Router();

// GET /flash-deals/active — Aktif fırsatlar
flashDealsRouter.get(
  "/active",
  validateQuery(activeQuerySchema),
  listActiveDeals,
);

// GET /flash-deals/upcoming — Yaklaşan fırsatlar (teaser)
flashDealsRouter.get(
  "/upcoming",
  validateQuery(upcomingQuerySchema),
  listUpcomingDeals,
);

// GET /flash-deals/:dealId — Tekil fırsat
flashDealsRouter.get(
  "/:dealId",
  validateParams(dealIdParamsSchema),
  getDeal,
);

// POST /flash-deals/:dealId/interact — Etkileşim kaydet
flashDealsRouter.post(
  "/:dealId/interact",
  validateParams(dealIdParamsSchema),
  validateBody(interactBodySchema),
  interactWithDeal,
);
