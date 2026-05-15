import { ApiError } from "../../utils/apiError";
import {
  flashDealToDto,
  flashDealToTeaserDto,
  computeEffectiveStatus,
  type FlashDealDto,
  type FlashDealTeaserDto,
} from "../_shared/flashDealDto";
import { flashDealsRepository } from "./flash-deals.repository";

export class FlashDealsService {
  // ─── Kullanıcı Tarafı ───

  /**
   * Aktif fırsatları listeler.
   * Effective status hesaplayarak sadece gerçekten aktif olanları döner.
   */
  async listActive(
    userId: string,
    limit: number,
    type?: string,
  ): Promise<{ data: FlashDealDto[]; meta: { total: number; serverTime: string } }> {
    const now = new Date();
    const deals = await flashDealsRepository.findActiveDeals(now, limit, type);

    // Her deal için kullanıcı etkileşimlerini çek
    const data: FlashDealDto[] = [];
    for (const deal of deals) {
      // Effective status ile çift kontrol
      const effective = computeEffectiveStatus(deal);
      if (effective !== "active") continue;

      const interactions = await flashDealsRepository.findUserInteractions(userId, deal.id);
      data.push(flashDealToDto(deal, interactions));
    }

    return {
      data,
      meta: { total: data.length, serverTime: now.toISOString() },
    };
  }

  /**
   * Yaklaşan fırsatları teaser olarak döner.
   * Fiyat/stok bilgisi gizli — sadece başlık, görsel ve başlangıç zamanı.
   */
  async listUpcoming(limit: number): Promise<{ data: FlashDealTeaserDto[] }> {
    const now = new Date();
    const deals = await flashDealsRepository.findUpcomingDeals(now, limit);
    return {
      data: deals.map((d) => flashDealToTeaserDto(d)),
    };
  }

  /**
   * Tek fırsat detayı.
   */
  async getById(dealId: string, userId: string): Promise<FlashDealDto> {
    const deal = await flashDealsRepository.findById(dealId);
    if (!deal) {
      throw new ApiError(404, "flash_deal_not_found", "Flash deal was not found or has expired.");
    }
    const interactions = await flashDealsRepository.findUserInteractions(userId, deal.id);
    return flashDealToDto(deal, interactions);
  }

  /**
   * Kullanıcı etkileşimi kaydeder.
   * Claim için stok kontrolü ve atomic decrement yapar.
   */
  async interact(
    userId: string,
    dealId: string,
    type: string,
    platform: string,
  ): Promise<{ recorded: true; remainingStock: number }> {
    const deal = await flashDealsRepository.findById(dealId);
    if (!deal) {
      throw new ApiError(404, "flash_deal_not_found", "Flash deal was not found.");
    }

    // Effective status kontrolü
    const effective = computeEffectiveStatus(deal);
    if (effective !== "active" && type !== "impression") {
      throw new ApiError(409, "deal_not_active", `Flash deal is currently ${effective}.`);
    }

    if (type === "claim") {
      // Stok kontrolü — atomic
      const result = await flashDealsRepository.decrementStock(dealId);
      if (result.count === 0) {
        throw new ApiError(409, "out_of_stock", "Bu fırsat tükendi.");
      }
    }

    // Etkileşimi kaydet
    await flashDealsRepository.createInteraction(userId, dealId, type, platform);

    // Güncel stok bilgisini döndür
    const updated = await flashDealsRepository.findById(dealId);
    return {
      recorded: true,
      remainingStock: updated?.remainingStock ?? 0,
    };
  }

  // ─── Admin Tarafı ───

  async adminList(params: { status?: string; type?: string; page: number; limit: number }) {
    const { total, items } = await flashDealsRepository.adminList(params);
    return {
      data: items,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async adminGetById(dealId: string) {
    const deal = await flashDealsRepository.adminFindById(dealId);
    if (!deal) {
      throw new ApiError(404, "flash_deal_not_found", "Flash deal was not found.");
    }
    return deal;
  }

  async adminCreate(body: {
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl: string;
    imageUrls?: string[];
    originalMilyem: number;
    dealMilyem: number;
    totalStock: number;
    type?: string;
    startsAt: string;
    endsAt: string;
    ctaLabel?: string;
    ctaType?: string;
    ctaValue?: string;
    productId?: string;
    targetTier?: string;
    priority?: number;
  }) {
    // discountPercent otomatik hesapla
    const discountPercent =
      Math.round(((body.originalMilyem - body.dealMilyem) / body.originalMilyem) * 100 * 100) / 100;

    const deal = await flashDealsRepository.create({
      title: body.title,
      subtitle: body.subtitle ?? null,
      description: body.description ?? null,
      imageUrl: body.imageUrl,
      imageUrls: body.imageUrls ?? [],
      originalMilyem: body.originalMilyem,
      dealMilyem: body.dealMilyem,
      discountPercent,
      totalStock: body.totalStock,
      remainingStock: body.totalStock,
      type: (body.type as any) ?? "daily",
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      ctaLabel: body.ctaLabel ?? "Sepete Ekle",
      ctaType: (body.ctaType as any) ?? "product",
      ctaValue: body.ctaValue ?? null,
      productId: body.productId ?? null,
      targetTier: body.targetTier ?? null,
      priority: body.priority ?? 0,
    });

    return deal;
  }

  async adminUpdate(dealId: string, body: Record<string, unknown>) {
    const existing = await flashDealsRepository.adminFindById(dealId);
    if (!existing) {
      throw new ApiError(404, "flash_deal_not_found", "Flash deal was not found.");
    }

    // Milyem değişmişse discountPercent'i yeniden hesapla
    const updateData: Record<string, unknown> = { ...body };
    const newOriginal = (body.originalMilyem as number) ?? Number(existing.originalMilyem);
    const newDeal = (body.dealMilyem as number) ?? Number(existing.dealMilyem);

    if (body.originalMilyem !== undefined || body.dealMilyem !== undefined) {
      updateData.discountPercent =
        Math.round(((newOriginal - newDeal) / newOriginal) * 100 * 100) / 100;
    }

    // Date string'leri Date objesine çevir
    if (typeof body.startsAt === "string") updateData.startsAt = new Date(body.startsAt);
    if (typeof body.endsAt === "string") updateData.endsAt = new Date(body.endsAt);

    return flashDealsRepository.update(dealId, updateData as any);
  }

  async adminUpdateStatus(dealId: string, status: string) {
    const existing = await flashDealsRepository.adminFindById(dealId);
    if (!existing) {
      throw new ApiError(404, "flash_deal_not_found", "Flash deal was not found.");
    }
    return flashDealsRepository.update(dealId, { status: status as any });
  }

  async adminDelete(dealId: string) {
    const existing = await flashDealsRepository.adminFindById(dealId);
    if (!existing) {
      throw new ApiError(404, "flash_deal_not_found", "Flash deal was not found.");
    }
    return flashDealsRepository.softDelete(dealId);
  }

  async adminAnalytics(dealId: string) {
    const deal = await flashDealsRepository.adminFindById(dealId);
    if (!deal) {
      throw new ApiError(404, "flash_deal_not_found", "Flash deal was not found.");
    }

    const [counts, uniqueImpressions] = await Promise.all([
      flashDealsRepository.getInteractionCounts(dealId),
      flashDealsRepository.getUniqueImpressions(dealId),
    ]);

    const clickThroughRate =
      counts.impression > 0
        ? Math.round((counts.click / counts.impression) * 100 * 100) / 100
        : 0;
    const conversionRate =
      counts.click > 0
        ? Math.round((counts.claim / counts.click) * 100 * 100) / 100
        : 0;

    return {
      dealId: deal.id,
      title: deal.title,
      metrics: {
        impressions: counts.impression,
        uniqueImpressions,
        clicks: counts.click,
        claims: counts.claim,
        shares: counts.share,
        clickThroughRate,
        conversionRate,
      },
      stockStatus: {
        total: deal.totalStock,
        remaining: deal.remainingStock,
        soldPercent:
          deal.totalStock > 0
            ? Math.round(((deal.totalStock - deal.remainingStock) / deal.totalStock) * 100)
            : 0,
      },
      timeStatus: {
        startsAt: deal.startsAt.toISOString(),
        endsAt: deal.endsAt.toISOString(),
        effectiveStatus: computeEffectiveStatus(deal),
      },
    };
  }
}

export const flashDealsService = new FlashDealsService();
