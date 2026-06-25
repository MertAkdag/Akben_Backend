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
import {
  sendWhatsappTemplateBatch,
  type WhatsappBroadcastResult,
} from "./notifications.whatsapp";

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
  subtitle?: string | null; // iOS alt başlık
  imageUrl?: string | null; // görselli bildirim
  categoryId?: string | null; // aksiyon butonu kategorisi (boşsa tipe göre türetilir)
  sound?: "default" | "silent" | null; // "silent" → sessiz (sound:null)
  priority?: "default" | "normal" | "high"; // boşsa "high"
  interruptionLevel?:
    | "active"
    | "critical"
    | "passive"
    | "time-sensitive"
    | null; // boşsa tipe göre (PRICE=time-sensitive)
  targetTiers?: string[];
  targetPlatforms?: string[];
  createdBy?: string | null;
  // WhatsApp (demo): elle girilen numaralara onaylı template. Push'tan bağımsız, non-fatal.
  whatsapp?: {
    enabled: boolean;
    to: string[];
    template: string;
    language: string;
    variables: string[];
  } | null;
}

// Kampanya DTO'su + (opsiyonel) WhatsApp gönderim özeti. WhatsApp push'tan bağımsızdır
// ve kampanya kaydını ETKİLEMEZ — yalnızca yanıt için iliştirilir.
type BroadcastResult = CampaignDto & { whatsapp?: WhatsappBroadcastResult };

// NotificationType -> Android kanal / aksiyon kategorisi eşlemesi.
// ⚠ Bu string'ler mobil pushRegistration.ts'teki NOTIF_CHANNELS / kategori id'leri ile BİREBİR aynı olmalı.
const TYPE_TO_CHANNEL: Record<string, string> = {
  CAMPAIGN: "campaign",
  ORDER: "order",
  PRICE: "price",
  SYSTEM: "system",
};
const TYPE_TO_CATEGORY: Record<string, string> = {
  CAMPAIGN: "campaign",
  ORDER: "order",
  PRICE: "price",
};

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
  /**
   * WhatsApp (demo) gönderimi — push'tan tamamen bağımsız, non-fatal.
   * enabled değilse / numara yoksa undefined döner (yanıta eklenmez).
   * Hata yutulur: WhatsApp başarısızlığı kampanyayı asla etkilemez.
   */
  private async maybeSendWhatsapp(
    input: BroadcastInput,
  ): Promise<WhatsappBroadcastResult | undefined> {
    const wa = input.whatsapp;
    if (!wa?.enabled || wa.to.length === 0) return undefined;
    try {
      return await sendWhatsappTemplateBatch(
        wa.to,
        wa.template,
        wa.language,
        wa.variables,
      );
    } catch (err) {
      console.error(
        "[notifications] WhatsApp gönderimi başarısız (push etkilenmedi):",
        err instanceof Error ? err.message : err,
      );
      return {
        configured: true,
        attempted: wa.to.length,
        sent: 0,
        failed: wa.to.length,
        results: wa.to.map((to) => ({ to, ok: false, error: "send_failed" })),
      };
    }
  }

  async sendBroadcast(input: BroadcastInput): Promise<BroadcastResult> {
    const targetTiers = input.targetTiers ?? [];
    const targetPlatforms = input.targetPlatforms ?? [];
    // subtitle/imageUrl'i data'ya katla → campaign.data + notification.data ile round-trip eder
    // (migration'sız: admin geçmişi + mobil inbox bu alanları data'dan okuyabilir).
    const data: Record<string, unknown> = {
      ...(input.data ?? {}),
      ...(input.subtitle ? { subtitle: input.subtitle } : {}),
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    };

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

      // Rozet (iOS): kullanıcının mevcut okunmamışı + bu broadcast (henüz inbox'a yazılmadı) = +1.
      const badgeUserIds = [...new Set(sendableDevices.map((d) => d.userId))];
      const unreadByUser =
        await notificationsRepository.countUnreadByUsers(badgeUserIds);

      const channelId = TYPE_TO_CHANNEL[input.type] ?? "default";
      const categoryId = input.categoryId ?? TYPE_TO_CATEGORY[input.type];
      const sound: "default" | null = input.sound === "silent" ? null : "default";
      const priority = input.priority ?? "high";
      // interruptionLevel: panel override > tip varsayılanı (PRICE=time-sensitive).
      const interruptionLevel =
        input.interruptionLevel ??
        (input.type === "PRICE" ? "time-sensitive" : undefined);

      const messages: ExpoMessage[] = sendableDevices.map((d) => ({
        to: d.expoPushToken,
        title: input.title,
        ...(input.subtitle ? { subtitle: input.subtitle } : {}),
        body: input.body,
        sound,
        priority,
        channelId,
        ...(categoryId ? { categoryId } : {}),
        badge: (unreadByUser.get(d.userId) ?? 0) + 1,
        ...(input.imageUrl
          ? { mutableContent: true, richContent: { image: input.imageUrl } }
          : {}),
        ...(interruptionLevel ? { interruptionLevel } : {}),
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

    // WhatsApp (demo): push tamamlandıktan sonra, kampanya kaydından bağımsız gönder.
    const whatsapp = await this.maybeSendWhatsapp(input);

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
      return { ...campaignToDto(updated), ...(whatsapp ? { whatsapp } : {}) };
    } catch (err) {
      // Push gitti ama inbox/final-update başarısız. 'failed' DEĞİL — durumu 'sent'e taşımayı dene.
      console.error(
        "[notifications] push gönderildi ancak inbox/kampanya finalize edilemedi:",
        err instanceof Error ? err.message : err,
      );
      const recovered = await notificationsRepository
        .updateCampaign(campaign.id, campaignUpdate)
        .catch(() => null);
      if (recovered)
        return { ...campaignToDto(recovered), ...(whatsapp ? { whatsapp } : {}) };
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
