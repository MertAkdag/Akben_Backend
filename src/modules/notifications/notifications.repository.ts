import type {
  Prisma,
  Platform,
  $Enums,
} from "../../generated/prisma/index";
import { prisma } from "../../config/prisma";

/**
 * NotificationType -> NotificationPreference alan adı eşlemesi.
 * Hangi tipin hangi opt-in toggle'ına bağlı olduğunu belirler.
 */
const TYPE_TO_PREF: Record<string, keyof PreferenceFlags> = {
  CAMPAIGN: "campaigns",
  ORDER: "orders",
  PRICE: "prices",
  SYSTEM: "system",
};

interface PreferenceFlags {
  campaigns: boolean;
  orders: boolean;
  prices: boolean;
  system: boolean;
}

export class NotificationsRepository {
  // ─── Devices ───

  /**
   * Token bazında upsert. Aynı token başka kullanıcıya geçtiyse userId güncellenir
   * (cihaz el değiştirdi). disabledAt sıfırlanır (yeniden aktif).
   */
  async upsertDevice(data: {
    userId: string;
    expoPushToken: string;
    platform: string;
    tier?: string | null;
    appVersion?: string | null;
    locale?: string | null;
    deviceName?: string | null;
  }) {
    const now = new Date();
    return prisma.device.upsert({
      where: { expoPushToken: data.expoPushToken },
      create: {
        userId: data.userId,
        expoPushToken: data.expoPushToken,
        platform: data.platform as Prisma.DeviceCreateInput["platform"],
        tier: data.tier ?? null,
        appVersion: data.appVersion ?? null,
        locale: data.locale ?? null,
        deviceName: data.deviceName ?? null,
        lastSeenAt: now,
      },
      update: {
        userId: data.userId,
        platform: data.platform as Prisma.DeviceCreateInput["platform"],
        tier: data.tier ?? null,
        appVersion: data.appVersion ?? null,
        locale: data.locale ?? null,
        deviceName: data.deviceName ?? null,
        lastSeenAt: now,
        disabledAt: null,
      },
    });
  }

  /**
   * Token'ı sahibi (userId) eşleşiyorsa siler. Başkasının token'ını silemez.
   */
  async deleteDeviceForUser(userId: string, expoPushToken: string) {
    return prisma.device.deleteMany({ where: { userId, expoPushToken } });
  }

  /**
   * Hedef kitle cihazlarını getirir (aktif = disabledAt null).
   * targetTiers / targetPlatforms boşsa o boyutta filtre uygulanmaz.
   */
  async findTargetDevices(targetTiers: string[], targetPlatforms: string[]) {
    const where: Prisma.DeviceWhereInput = { disabledAt: null };
    if (targetTiers.length > 0) where.tier = { in: targetTiers };
    if (targetPlatforms.length > 0) {
      // platforms zod ile "ios"|"android"|"web"e daraltıldı — Platform enum değerleriyle birebir.
      where.platform = { in: targetPlatforms as Platform[] };
    }
    return prisma.device.findMany({
      where,
      select: {
        id: true,
        userId: true,
        expoPushToken: true,
        platform: true,
        tier: true,
      },
    });
  }

  /**
   * Verilen token'ları disable eder (Expo DeviceNotRegistered prune).
   */
  async disableTokens(tokens: string[]) {
    if (tokens.length === 0) return { count: 0 };
    return prisma.device.updateMany({
      where: { expoPushToken: { in: tokens } },
      data: { disabledAt: new Date() },
    });
  }

  // ─── Preferences ───

  async getPreference(userId: string) {
    return prisma.notificationPreference.findUnique({ where: { userId } });
  }

  /**
   * Verilen userId'ler içinde, ilgili bildirim tipini KAPATMIŞ olanların setini döner.
   * Preference satırı yoksa varsayılan açık kabul edilir (set'e girmez).
   */
  async findOptedOutUserIds(
    userIds: string[],
    type: string,
  ): Promise<Set<string>> {
    const prefField = TYPE_TO_PREF[type];
    if (!prefField || userIds.length === 0) return new Set();
    const where: Prisma.NotificationPreferenceWhereInput = {
      userId: { in: userIds },
    };
    (where as Record<string, unknown>)[prefField] = false;
    const rows = await prisma.notificationPreference.findMany({
      where,
      select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId));
  }

  async upsertPreference(
    userId: string,
    patch: Partial<PreferenceFlags & { email: boolean; sms: boolean }>,
  ) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...patch },
      update: { ...patch },
    });
  }

  // ─── Inbox (Notification) ───

  async createNotificationsForUsers(
    userIds: string[],
    payload: {
      type: $Enums.NotificationType;
      title: string;
      body: string;
      data: Prisma.InputJsonValue;
      deepLink?: string | null;
      campaignId?: string | null;
    },
    tx: Prisma.TransactionClient = prisma,
  ) {
    if (userIds.length === 0) return { count: 0 };
    return tx.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        deepLink: payload.deepLink ?? null,
        campaignId: payload.campaignId ?? null,
      })),
    });
  }

  async listNotifications(userId: string, limit: number, cursor?: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // +1 -> nextCursor tespiti
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  async countUnread(userId: string) {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }

  /**
   * Birden çok kullanıcının okunmamış sayısını tek groupBy ile döner (broadcast rozeti).
   * Map'te olmayan kullanıcı = 0 okunmamış.
   */
  async countUnreadByUsers(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const rows = await prisma.notification.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, readAt: null },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.userId, r._count._all]));
  }

  async markRead(userId: string, id: string) {
    return prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /** Sahiplik kontrolü için: bildirim bu kullanıcıya mı ait? (id+userId) */
  async findNotificationById(userId: string, id: string) {
    return prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true, readAt: true },
    });
  }

  /** Tekil bildirim (detay ekranı için) — inbox cache soğuk/sayfa dışıysa fallback. */
  async getNotificationForUser(userId: string, id: string) {
    return prisma.notification.findFirst({ where: { id, userId } });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  // ─── Campaigns (admin) ───

  async createCampaign(data: Prisma.NotificationCampaignCreateInput) {
    return prisma.notificationCampaign.create({ data });
  }

  async updateCampaign(
    id: string,
    data: Prisma.NotificationCampaignUpdateInput,
    tx: Prisma.TransactionClient = prisma,
  ) {
    return tx.notificationCampaign.update({ where: { id }, data });
  }

  async findCampaignById(id: string) {
    return prisma.notificationCampaign.findUnique({ where: { id } });
  }

  /**
   * Push gönderildikten SONRA inbox yazımı + kampanya final update'ini atomik yapar.
   * İkisi tek transaction — biri patlarsa ikisi de geri alınır (yarım inbox kalmaz).
   */
  async commitBroadcastResults(params: {
    campaignId: string;
    recipientUserIds: string[];
    notification: {
      type: $Enums.NotificationType;
      title: string;
      body: string;
      data: Prisma.InputJsonValue;
      deepLink?: string | null;
      campaignId?: string | null;
    };
    campaignUpdate: Prisma.NotificationCampaignUpdateInput;
  }) {
    return prisma.$transaction(async (tx) => {
      await this.createNotificationsForUsers(
        params.recipientUserIds,
        params.notification,
        tx,
      );
      return this.updateCampaign(params.campaignId, params.campaignUpdate, tx);
    });
  }

  async listCampaigns(params: { page: number; limit: number; status?: string }) {
    const where: Prisma.NotificationCampaignWhereInput = {};
    if (params.status) {
      where.status = params.status as Prisma.NotificationCampaignWhereInput["status"];
    }
    const [total, items] = await Promise.all([
      prisma.notificationCampaign.count({ where }),
      prisma.notificationCampaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);
    return { total, items };
  }
}

export const notificationsRepository = new NotificationsRepository();
