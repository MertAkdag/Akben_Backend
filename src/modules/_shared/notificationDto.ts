import type {
  Device,
  Notification,
  NotificationCampaign,
  NotificationPreference,
} from "../../generated/prisma/index";

// ─── Inbox item (mobil notification center ile uyumlu) ───
export interface NotificationDto {
  id: string;
  type: Notification["type"];
  title: string;
  message: string; // mobil "message" alanı = body
  body: string;
  data: Record<string, unknown>;
  deepLink: string | null;
  unread: boolean;
  createdAt: string; // ISO — timeLabel mobilde formatlanır
}

export function notificationToDto(n: Notification): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.body,
    body: n.body,
    data: (n.data ?? {}) as Record<string, unknown>,
    deepLink: n.deepLink ?? null,
    unread: n.readAt === null,
    createdAt: n.createdAt.toISOString(),
  };
}

// ─── Notification preferences ───
export interface PreferenceDto {
  campaigns: boolean;
  orders: boolean;
  prices: boolean;
  system: boolean;
  email: boolean;
  sms: boolean;
}

export function preferenceToDto(p: NotificationPreference): PreferenceDto {
  return {
    campaigns: p.campaigns,
    orders: p.orders,
    prices: p.prices,
    system: p.system,
    email: p.email,
    sms: p.sms,
  };
}

// ─── Device (kayıt yanıtı) ───
export interface DeviceDto {
  id: string;
  platform: Device["platform"];
  tier: string | null;
  appVersion: string | null;
  createdAt: string;
}

export function deviceToDto(d: Device): DeviceDto {
  return {
    id: d.id,
    platform: d.platform,
    tier: d.tier ?? null,
    appVersion: d.appVersion ?? null,
    createdAt: d.createdAt.toISOString(),
  };
}

// ─── Campaign (admin) ───
export interface CampaignDto {
  id: string;
  title: string;
  body: string;
  type: NotificationCampaign["type"];
  data: Record<string, unknown>;
  deepLink: string | null;
  targetTiers: string[];
  targetPlatforms: string[];
  status: NotificationCampaign["status"];
  audienceCount: number;
  sentCount: number;
  failedCount: number;
  createdBy: string | null;
  sentAt: string | null;
  createdAt: string;
}

export function campaignToDto(c: NotificationCampaign): CampaignDto {
  return {
    id: c.id,
    title: c.title,
    body: c.body,
    type: c.type,
    data: (c.data ?? {}) as Record<string, unknown>,
    deepLink: c.deepLink ?? null,
    targetTiers: c.targetTiers,
    targetPlatforms: c.targetPlatforms,
    status: c.status,
    audienceCount: c.audienceCount,
    sentCount: c.sentCount,
    failedCount: c.failedCount,
    createdBy: c.createdBy ?? null,
    sentAt: c.sentAt ? c.sentAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  };
}
