import { Router } from "express";
import { z } from "zod";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../middlewares/validate.middleware";
import {
  registerDevice,
  unregisterDevice,
  listInbox,
  getUnreadCount,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
} from "./notifications.controller";

// ─── Zod Schemas ───

const registerDeviceSchema = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(["ios", "android", "web"]),
  tier: z.enum(["wholesale", "vip_wholesale"]).nullable().optional(),
  appVersion: z.string().max(40).nullable().optional(),
  locale: z.string().max(20).nullable().optional(),
  deviceName: z.string().max(120).nullable().optional(),
});

const tokenParamsSchema = z.object({
  token: z.string().min(1),
});

const inboxQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

const preferencesSchema = z
  .object({
    campaigns: z.boolean().optional(),
    orders: z.boolean().optional(),
    prices: z.boolean().optional(),
    system: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "En az bir tercih alanı gönderilmeli",
  });

// ─── Router ───

export const notificationsRouter = Router();

// POST /notifications/devices — push token kaydı (login sonrası / token değişince)
notificationsRouter.post(
  "/devices",
  validateBody(registerDeviceSchema),
  registerDevice,
);

// DELETE /notifications/devices/:token — logout'ta token sil
notificationsRouter.delete(
  "/devices/:token",
  validateParams(tokenParamsSchema),
  unregisterDevice,
);

// GET /notifications — inbox (cursor paginated)
notificationsRouter.get("/", validateQuery(inboxQuerySchema), listInbox);

// GET /notifications/unread-count — okunmamış sayısı (badge)
notificationsRouter.get("/unread-count", getUnreadCount);

// GET /notifications/settings — tercihleri getir
notificationsRouter.get("/settings", getPreferences);

// PUT /notifications/settings — tercihleri güncelle
notificationsRouter.put(
  "/settings",
  validateBody(preferencesSchema),
  updatePreferences,
);

// PATCH /notifications/read-all — hepsini okundu işaretle
notificationsRouter.patch("/read-all", markAllRead);

// PATCH /notifications/:id/read — tek bildirimi okundu işaretle
notificationsRouter.patch(
  "/:id/read",
  validateParams(idParamsSchema),
  markRead,
);
