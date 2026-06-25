import { Router } from "express";
import { z } from "zod";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validate.middleware";
import { tierEnum, platformEnum, idParamsSchema } from "./notifications.schemas";
import {
  adminPreviewAudience,
  adminSendBroadcast,
  adminListCampaigns,
  adminGetCampaign,
} from "./notifications.controller";

// ─── Zod Schemas ───

const audiencePreviewSchema = z.object({
  targetTiers: z.array(tierEnum).max(2).default([]),
  targetPlatforms: z.array(platformEnum).max(3).default([]),
});

// v1: segment yok — sadece broadcast. tier/platform filtresi opsiyonel (boş = herkes).
const broadcastSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  type: z.enum(["CAMPAIGN", "ORDER", "PRICE", "SYSTEM"]).default("CAMPAIGN"),
  data: z.record(z.string(), z.unknown()).default({}),
  deepLink: z.string().max(500).nullable().optional(),
  subtitle: z.string().max(120).nullable().optional(), // iOS alt başlık
  imageUrl: z.string().url().max(2000).nullable().optional(), // görselli bildirim
  categoryId: z.string().max(60).nullable().optional(), // aksiyon butonu kategorisi (boş = tipe göre)
  sound: z.enum(["default", "silent"]).default("default"), // sessiz gönderim
  priority: z.enum(["default", "normal", "high"]).default("high"),
  interruptionLevel: z
    .enum(["active", "critical", "passive", "time-sensitive"])
    .nullable()
    .optional(), // boş = tipe göre (PRICE=time-sensitive). critical = Apple entitlement gerektirir.
  targetTiers: z.array(tierEnum).max(2).default([]),
  targetPlatforms: z.array(platformEnum).max(3).default([]),
  // WhatsApp (demo): panelden elle girilen numaralara onaylı template gönder.
  // Push'tan bağımsız — Meta business-initiated kuralı serbest metin değil template ister.
  whatsapp: z
    .object({
      enabled: z.boolean().default(false),
      to: z.array(z.string().min(5).max(20)).max(50).default([]), // ham numaralar (server normalize eder)
      template: z.string().min(1).max(80), // onaylı template adı
      language: z.string().min(2).max(10).default("tr"), // template dil kodu
      variables: z.array(z.string().max(500)).max(10).default([]), // BODY {{1}}, {{2}}, ...
    })
    .optional(),
});

const listQuerySchema = z.object({
  status: z.enum(["draft", "sending", "sent", "failed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─── Router ───

export const adminNotificationsRouter = Router();

// POST /admin/notifications/preview-audience — göndermeden hedef kitle sayısı
adminNotificationsRouter.post(
  "/preview-audience",
  validateBody(audiencePreviewSchema),
  adminPreviewAudience,
);

// POST /admin/notifications/send — broadcast gönder
adminNotificationsRouter.post(
  "/send",
  validateBody(broadcastSchema),
  adminSendBroadcast,
);

// GET /admin/notifications/campaigns — kampanya geçmişi
adminNotificationsRouter.get(
  "/campaigns",
  validateQuery(listQuerySchema),
  adminListCampaigns,
);

// GET /admin/notifications/campaigns/:id — tekil kampanya
adminNotificationsRouter.get(
  "/campaigns/:id",
  validateParams(idParamsSchema),
  adminGetCampaign,
);
