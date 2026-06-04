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
  type: string; // CAMPAIGN | ORDER | PRICE | SYSTEM
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

  async markRead(userId: string, id: string) {
    const res = await notificationsRepository.markRead(userId, id);
    if (res.count === 0) {
      // Zaten okunmuş ya da kullanıcıya ait değil — idempotent davran, hata yine de bildir.
      const exists = await notificationsRepository
        .listNotifications(userId, 1, undefined)
        .then((r) => r.some((n) => n.id === id));
      if (!exists) {
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

    // 1) Kampanyayı 'sending' olarak oluştur.
    const campaign = await notificationsRepository.createCampaign({
      title: input.title,
      body: input.body,
      type: input.type as any,
      data: data as any,
      deepLink: input.deepLink ?? null,
      targetTiers,
      targetPlatforms,
      status: "sending",
      createdBy: input.createdBy ?? null,
    });

    try {
      // 2) Hedef cihazlar.
      const devices = await notificationsRepository.findTargetDevices(
        targetTiers,
        targetPlatforms,
      );

      // 3) Bu tipi kapatmış kullanıcıları ele (opt-out).
      const userIds = [...new Set(devices.map((d) => d.userId))];
      const optedOut = await notificationsRepository.findOptedOutUserIds(
        userIds,
        input.type,
      );
      const sendableDevices = devices.filter(
        (d) => !optedOut.has(d.userId) && isExpoPushToken(d.expoPushToken),
      );
      const recipientUserIds = [
        ...new Set(sendableDevices.map((d) => d.userId)),
      ];

      // 4) Expo mesajları (cihaz başına 1).
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

      // 5) Gönder.
      const tickets = await sendExpoPush(messages);

      // 6) Ticket'ları değerlendir: ok -> sent, DeviceNotRegistered -> token prune.
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
        await notificationsRepository.disableTokens(deadTokens);
      }

      // 7) Inbox kayıtları (kullanıcı başına 1).
      await notificationsRepository.createNotificationsForUsers(
        recipientUserIds,
        {
          type: input.type,
          title: input.title,
          body: input.body,
          data: data as any,
          deepLink: input.deepLink ?? null,
          campaignId: campaign.id,
        },
      );

      // 8) Kampanyayı güncelle.
      const updated = await notificationsRepository.updateCampaign(campaign.id, {
        status: "sent",
        audienceCount: sendableDevices.length,
        sentCount,
        failedCount,
        sentAt: new Date(),
      });
      return campaignToDto(updated);
    } catch (err) {
      await notificationsRepository.updateCampaign(campaign.id, {
        status: "failed",
      });
      throw err instanceof ApiError
        ? err
        : new ApiError(
            502,
            "push_send_failed",
            err instanceof Error ? err.message : "Push gönderimi başarısız",
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
