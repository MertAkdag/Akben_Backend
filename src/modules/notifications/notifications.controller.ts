import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/response";
import { notificationsService } from "./notifications.service";

// ─────────────────────── Kullanıcı Tarafı ───────────────────────

export const registerDevice = asyncHandler(async (req, res) => {
  // userId DAİMA token'dan — body'den değil (decode-only güvenlik kuralı).
  const data = await notificationsService.registerDevice(req.userId, req.body);
  res.status(201).json({ success: true, data });
});

export const unregisterDevice = asyncHandler(async (req, res) => {
  const { token } = req.params as { token: string };
  const data = await notificationsService.unregisterDevice(req.userId, token);
  ok(res, data);
});

export const listInbox = asyncHandler(async (req, res) => {
  // limit default'u zod şemasında (inboxQuerySchema.default(20)) — burada fallback yok.
  const { limit, cursor } = req.query as unknown as {
    limit: number;
    cursor?: string;
  };
  const result = await notificationsService.listInbox(req.userId, limit, cursor);
  res.status(200).json({
    success: true,
    meta: result.meta,
    data: result.data,
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const data = await notificationsService.unreadCount(req.userId);
  ok(res, data);
});

export const getNotification = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const data = await notificationsService.getNotification(req.userId, id);
  ok(res, data);
});

export const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const data = await notificationsService.markRead(req.userId, id);
  ok(res, data);
});

export const markAllRead = asyncHandler(async (req, res) => {
  const data = await notificationsService.markAllRead(req.userId);
  ok(res, data);
});

export const getPreferences = asyncHandler(async (req, res) => {
  const data = await notificationsService.getPreferences(req.userId);
  ok(res, data);
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const data = await notificationsService.updatePreferences(
    req.userId,
    req.body,
  );
  ok(res, data);
});

// ─────────────────────── Admin Tarafı ───────────────────────

export const adminPreviewAudience = asyncHandler(async (req, res) => {
  const { targetTiers, targetPlatforms } = req.body as {
    targetTiers?: string[];
    targetPlatforms?: string[];
  };
  const data = await notificationsService.previewAudience(
    targetTiers ?? [],
    targetPlatforms ?? [],
  );
  ok(res, data);
});

export const adminSendBroadcast = asyncHandler(async (req, res) => {
  const data = await notificationsService.sendBroadcast({
    ...req.body,
    createdBy: req.userId,
  });
  res.status(201).json({ success: true, data });
});

export const adminListCampaigns = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query as unknown as {
    page: number;
    limit: number;
    status?: string;
  };
  const result = await notificationsService.listCampaigns({
    page: page ?? 1,
    limit: limit ?? 20,
    status,
  });
  res.status(200).json({ success: true, meta: result.meta, data: result.data });
});

export const adminGetCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };
  const data = await notificationsService.getCampaign(id);
  ok(res, data);
});
