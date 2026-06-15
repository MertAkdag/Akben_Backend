import type { Prisma, $Enums } from "../../generated/prisma/index";
import { ApiError } from "../../utils/apiError";
import {
  campaignToDto,
  deviceToDto,
  notificationToDto,
  preferenceToDto,
  type CampaignDto,
  type NotificationDto,
  type PreferenceDto,
} from "../_shared/notificationDto";
import { notificationsRepository } from "./notifications.repository";
import {
  isExpoPushToken,
  sendExpoPush,
  type ExpoMessage,
  type ExpoTicket,
} from "./notifications.push";

interface RegisterDeviceInput {
  expoPushToken: string;
  platform: string;
  tier?: string | null;
  appVersion?: string | null;
  locale?: string | null;
  deviceName?: string | null;
}

interface BroadcastInput {
  title: string;
  body: string;
  type: $Enums.NotificationType; // CAMPAIGN | ORDER | PRICE | SYSTEM (zod ile daraltılmış)
  data?: Record<string, unknown>;
  deepLink?: string | null;
  targetTiers?: string[];
  targetPlatforms?: string[];
  createdBy?: string | null;
}

export class NotificationsService {
  // ─────────────────────────── Kullanıcı Tarafı ───────────────────────────

  /**
   * Cihaz (push token) kaydı. userId DAİMA token'dan (req.userId) gelir.
   */
  async registerDevice(userId: string, input: RegisterDeviceInput) {
    if (!isExpoPushToken(input.expoPushToken)) {
      throw new ApiError(
        422,
        "invalid_push_token",
        "expoPushToken geçerli bir Expo push token değil (ExponentPushToken[...] bekleniyor)",
      );
    }
    const device = await notificationsRepository.upsertDevice({
      userId,
      ...input,
    });
    return deviceToDto(device);
  }

  async unregisterDevice(userId: string, expoPushToken: string) {
    const res = await notificationsRepository.deleteDeviceForUser(
      userId,
      expoPushToken,
    );
    return { removed: res.count };
  }

  async listInbox(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<{
    data: NotificationDto[];
    meta: { nextCursor: string | null; unread: number };
  }> {
    const rows = await notificationsRepository.listNotifications(
      userId,
      limit,
      cursor,
    );
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const extra = rows.pop()!;
      nextCursor = extra.id;
    }
    const unread = await notificationsRepository.countUnread(userId);
    return { data: rows.map(notificationToDto), meta: { nextCursor, unread } };
  }

  async unreadCount(userId: string): Promise<{ unread: number }> {
    const unread = await notificationsRepository.countUnread(userId);
    return { unread };
  }

  /** Tekil bildirim (detay ekranı fallback). Kullanıcıya ait değilse 404. */
  async getNotification(userId: string, id: string): Promise<NotificationDto> {
    const row = await notificationsRepository.getNotificationForUser(userId, id);
    if (!row) throw new ApiError(404, "not_found", "Bildirim bulunamadı");
    return notificationToDto(row);
  }

  async markRead(userId: string, id: string) {
    const res = await notificationsRepository.markRead(userId, id);
    if (res.count === 0) {
      // markRead readAt:null filtreler → count 0: ya zaten okunmuş ya da kullanıcıya ait değil.
      // Sahiplik kontrolü id+userId ile (sayfa sınırından bağımsız) — okunmuşsa idempotent başarı.
      const owned = await notificationsRepository.findNotificationById(
        userId,
        id,
      );
      if (!owned) {
        throw new ApiError(404, "not_found", "Bildirim bulunamadı");
      }
    }
    return { read: true };
  }

  async markAllRead(userId: string) {
    const res = await notificationsRepository.markAllRead(userId);
    return { read: res.count };
  }

  // ─── Preferences ───

  async getPreferences(userId: string): Promise<PreferenceDto> {
    let pref = await notificationsRepository.getPreference(userId);
    if (!pref) {
      pref = await notificationsRepository.upsertPreference(userId, {});
    }
    return preferenceToDto(pref);
  }

  async updatePreferences(
    userId: string,
    patch: Partial<PreferenceDto>,
  ): Promise<PreferenceDto> {
    const pref = await notificationsRepository.upsertPreference(userId, patch);
    return preferenceToDto(pref);
  }

  // ─────────────────────────── Admin Tarafı ───────────────────────────

  /**
   * Hedef kitle önizlemesi — göndermeden audience sayısını döner.
   */
  async previewAudience(
    targetTiers: string[] = [],
    targetPlatforms: string[] = [],
  ): Promise<{ devices: number; users: number }> {
    const devices = await notificationsRepository.findTargetDevices(
      targetTiers,
      targetPlatforms,
    );
    const users = new Set(devices.map((d) => d.userId));
    return { devices: devices.length, users: users.size };
  }

  /**
   * Broadcast: kampanya oluştur, hedef cihazlara Expo push gönder, inbox'a yaz.
   * v1: segment yok — tier/platform filtresi opsiyonel (boş = herkes).
   */
  async sendBroadcast(input: BroadcastInput): Promise<CampaignDto> {
    const targetTiers = input.targetTiers ?? [];
    const targetPlatforms = input.targetPlatforms ?? [];
    const data = input.data ?? {};

    const jsonData = data as Prisma.InputJsonValue;

    // 1) Kampanyayı 'sending' olarak oluştur.
    const campaign = await notificationsRepository.createCampaign({
      title: input.title,
      body: input.body,
      type: input.type,
      data: jsonData,
      deepLink: input.deepLink ?? null,
      targetTiers,
      targetPlatforms,
      status: "sending",
      createdBy: input.createdBy ?? null,
    });

    // ── Faz A: Push gönderimi (geri alınamaz sınır). Buradan ÖNCE patlarsa 'failed'. ──
    let sendableDevices: Awaited<
      ReturnType<typeof notificationsRepository.findTargetDevices>
    >;
    let tickets: ExpoTicket[];
    try {
      const devices = await notificationsRepository.findTargetDevices(
        targetTiers,
        targetPlatforms,
      );

      // Bu tipi kapatmış kullanıcıları ele (opt-out).
      const userIds = [...new Set(devices.map((d) => d.userId))];
      const optedOut = await notificationsRepository.findOptedOutUserIds(
        userIds,
        input.type,
      );
      sendableDevices = devices.filter(
        (d) => !optedOut.has(d.userId) && isExpoPushToken(d.expoPushToken),
      );

      const messages: ExpoMessage[] = sendableDevices.map((d) => ({
        to: d.expoPushToken,
        title: input.title,
        body: input.body,
        sound: "default",
        priority: "high",
        channelId: "default",
        data: {
          ...data,
          type: input.type,
          deepLink: input.deepLink ?? null,
          campaignId: campaign.id,
        },
      }));

      tickets = await sendExpoPush(messages); // ← geri alınamaz sınır
    } catch (err) {
      // Push HİÇ gitmedi — kampanyayı 'failed' işaretle.
      await notificationsRepository
        .updateCampaign(campaign.id, { status: "failed" })
        .catch(() => {});
      throw err instanceof ApiError
        ? err
        : new ApiError(
            502,
            "push_send_failed",
            err instanceof Error ? err.message : "Push gönderimi başarısız",
          );
    }

    // ── Faz B: Push gitti. Bundan sonrası kampanyayı ASLA 'failed' yapmaz. ──
    let sentCount = 0;
    let failedCount = 0;
    const deadTokens: string[] = [];
    tickets.forEach((t: ExpoTicket, i) => {
      if (t.status === "ok") {
        sentCount++;
      } else {
        failedCount++;
        if (t.details?.error === "DeviceNotRegistered") {
          deadTokens.push(sendableDevices[i].expoPushToken);
        }
      }
    });
    if (deadTokens.length > 0) {
      await notificationsRepository.disableTokens(deadTokens).catch(() => {});
    }

    const recipientUserIds = [...new Set(sendableDevices.map((d) => d.userId))];
    const campaignUpdate: Prisma.NotificationCampaignUpdateInput = {
      status: "sent",
      audienceCount: sendableDevices.length,
      sentCount,
      failedCount,
      sentAt: new Date(),
    };

    try {
      // Inbox yazımı + final update atomik (yarım inbox kalmaz).
      const updated = await notificationsRepository.commitBroadcastResults({
        campaignId: campaign.id,
        recipientUserIds,
        notification: {
          type: input.type,
          title: input.title,
          body: input.body,
          data: jsonData,
          deepLink: input.deepLink ?? null,
          campaignId: campaign.id,
        },
        campaignUpdate,
      });
      return campaignToDto(updated);
    } catch (err) {
      // Push gitti ama inbox/final-update başarısız. 'failed' DEĞİL — durumu 'sent'e taşımayı dene.
      console.error(
        "[notifications] push gönderildi ancak inbox/kampanya finalize edilemedi:",
        err instanceof Error ? err.message : err,
      );
      const recovered = await notificationsRepository
        .updateCampaign(campaign.id, campaignUpdate)
        .catch(() => null);
      if (recovered) return campaignToDto(recovered);
      throw new ApiError(
        502,
        "push_sent_finalize_failed",
        "Push gönderildi ancak kayıt güncellenemedi",
      );
    }
  }

  async listCampaigns(params: {
    page: number;
    limit: number;
    status?: string;
  }): Promise<{ data: CampaignDto[]; meta: { total: number; page: number } }> {
    const { total, items } = await notificationsRepository.listCampaigns(params);
    return {
      data: items.map(campaignToDto),
      meta: { total, page: params.page },
    };
  }

  async getCampaign(id: string): Promise<CampaignDto> {
    const campaign = await notificationsRepository.findCampaignById(id);
    if (!campaign) throw new ApiError(404, "not_found", "Kampanya bulunamadı");
    return campaignToDto(campaign);
  }
}

export const notificationsService = new NotificationsService();
