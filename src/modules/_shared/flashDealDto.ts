import type { FlashDeal, FlashDealInteraction } from "../../generated/prisma/index";
import { DealStatus, DealType, FlashDealCtaType } from "../../generated/prisma/index";

// ─────────────────────────────────────────────
// DTO Tipleri
// ─────────────────────────────────────────────

export type FlashDealDto = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string;
  imageUrls: string[];

  // Milyem bazlı
  originalMilyem: number;
  dealMilyem: number;
  discountPercent: number;

  // Stok
  totalStock: number;
  remainingStock: number;
  stockPercent: number;

  // Zamanlama
  type: "daily" | "flash" | "weekend";
  startsAt: string;
  endsAt: string;
  remainingSeconds: number;
  effectiveStatus: "scheduled" | "active" | "expired" | "soldOut" | "cancelled";

  // CTA
  ctaLabel: string;
  ctaType: "product" | "link" | "whatsapp";
  ctaValue: string | null;
  productId: string | null;

  // Kullanıcıya özel
  hasUserClaimed: boolean;
};

/**
 * Teaser DTO — Yaklaşan fırsatlar için. Fiyat/stok bilgisi gizli.
 */
export type FlashDealTeaserDto = {
  id: string;
  title: string;
  imageUrl: string;
  startsAt: string;
  startsInSeconds: number;
  teaser: true;
};

// ─────────────────────────────────────────────
// Effective Status Hesaplama
// ─────────────────────────────────────────────

/**
 * DB'deki `status` alanına tek başına güvenmez.
 * Zaman ve stok bilgisini de hesaba katarak gerçek durumu döner.
 */
export function computeEffectiveStatus(deal: FlashDeal): FlashDealDto["effectiveStatus"] {
  if (deal.status === DealStatus.cancelled) return "cancelled";

  const now = new Date();
  if (now < deal.startsAt) return "scheduled";
  if (now >= deal.endsAt) return "expired";
  if (deal.remainingStock <= 0) return "soldOut";
  return "active";
}

// ─────────────────────────────────────────────
// Dönüştürücüler
// ─────────────────────────────────────────────

export function flashDealToDto(
  deal: FlashDeal,
  userInteractions: FlashDealInteraction[],
): FlashDealDto {
  const now = Date.now();
  const endsAtMs = new Date(deal.endsAt).getTime();
  const remainingSeconds = Math.max(0, Math.floor((endsAtMs - now) / 1000));

  return {
    id: deal.id,
    title: deal.title,
    subtitle: deal.subtitle,
    description: deal.description,
    imageUrl: deal.imageUrl,
    imageUrls: deal.imageUrls,
    originalMilyem: Number(deal.originalMilyem),
    dealMilyem: Number(deal.dealMilyem),
    discountPercent: Number(deal.discountPercent),
    totalStock: deal.totalStock,
    remainingStock: deal.remainingStock,
    stockPercent:
      deal.totalStock > 0
        ? Math.round((deal.remainingStock / deal.totalStock) * 100)
        : 0,
    type: dealTypeToApi(deal.type),
    startsAt: deal.startsAt.toISOString(),
    endsAt: deal.endsAt.toISOString(),
    remainingSeconds,
    effectiveStatus: computeEffectiveStatus(deal),
    ctaLabel: deal.ctaLabel,
    ctaType: ctaTypeToApi(deal.ctaType),
    ctaValue: deal.ctaValue,
    productId: deal.productId,
    hasUserClaimed: userInteractions.some((i) => i.type === "claim"),
  };
}

export function flashDealToTeaserDto(deal: FlashDeal): FlashDealTeaserDto {
  const now = Date.now();
  const startsAtMs = new Date(deal.startsAt).getTime();

  return {
    id: deal.id,
    title: deal.title,
    imageUrl: deal.imageUrl,
    startsAt: deal.startsAt.toISOString(),
    startsInSeconds: Math.max(0, Math.floor((startsAtMs - now) / 1000)),
    teaser: true,
  };
}

// ─────────────────────────────────────────────
// Enum Dönüştürücüler
// ─────────────────────────────────────────────

function dealTypeToApi(t: DealType): "daily" | "flash" | "weekend" {
  switch (t) {
    case DealType.daily:
      return "daily";
    case DealType.flash:
      return "flash";
    case DealType.weekend:
      return "weekend";
    default:
      const _exhaustive: never = t;
      return _exhaustive;
  }
}

function ctaTypeToApi(t: FlashDealCtaType): "product" | "link" | "whatsapp" {
  switch (t) {
    case FlashDealCtaType.product:
      return "product";
    case FlashDealCtaType.link:
      return "link";
    case FlashDealCtaType.whatsapp:
      return "whatsapp";
    default:
      const _exhaustive: never = t;
      return _exhaustive;
  }
}
