import type { Prisma } from "../../generated/prisma/index";
import { prisma } from "../../config/prisma";

export class FlashDealsRepository {
  /**
   * Aktif fırsatları getirir.
   * Sadece DB status'a güvenmez — zaman ve stok kontrolü de yapar.
   */
  async findActiveDeals(now: Date, limit: number, type?: string) {
    const where: Prisma.FlashDealWhereInput = {
      deletedAt: null,
      status: "active",
      startsAt: { lte: now },
      endsAt: { gt: now },
      remainingStock: { gt: 0 },
    };
    if (type) {
      where.type = type as Prisma.FlashDealWhereInput["type"];
    }

    return prisma.flashDeal.findMany({
      where,
      orderBy: [{ priority: "desc" }, { startsAt: "desc" }],
      take: limit,
    });
  }

  /**
   * Yaklaşan (henüz başlamamış) fırsatları getirir.
   */
  async findUpcomingDeals(now: Date, limit: number) {
    return prisma.flashDeal.findMany({
      where: {
        deletedAt: null,
        status: "scheduled",
        startsAt: { gt: now },
      },
      orderBy: { startsAt: "asc" },
      take: limit,
    });
  }

  /**
   * Tek fırsat — sadece silinmemiş olanlar.
   */
  async findById(dealId: string) {
    return prisma.flashDeal.findFirst({
      where: { id: dealId, deletedAt: null },
    });
  }

  /**
   * Kullanıcının belirli bir deal ile etkileşimlerini getirir.
   */
  async findUserInteractions(userId: string, dealId: string) {
    return prisma.flashDealInteraction.findMany({
      where: { userId, dealId },
    });
  }

  /**
   * Kullanıcının claim etkileşimi var mı kontrol eder.
   */
  async findUserClaim(userId: string, dealId: string) {
    return prisma.flashDealInteraction.findFirst({
      where: { userId, dealId, type: "claim" },
    });
  }

  /**
   * Stoku atomic olarak 1 azaltır.
   * Race condition'a karşı WHERE remainingStock > 0 koruması.
   * count === 0 ise stok tükenmiş demektir.
   */
  async decrementStock(dealId: string) {
    return prisma.flashDeal.updateMany({
      where: { id: dealId, remainingStock: { gt: 0 } },
      data: { remainingStock: { decrement: 1 } },
    });
  }

  /**
   * Etkileşim kaydı oluşturur.
   */
  async createInteraction(
    userId: string,
    dealId: string,
    type: string,
    platform: string,
  ) {
    return prisma.flashDealInteraction.create({
      data: {
        userId,
        dealId,
        type: type as any,
        platform: platform as any,
        createdAt: new Date(),
      },
    });
  }

  // ─── Admin ───

  /**
   * Admin listeleme — filtre, offset pagination.
   */
  async adminList(params: {
    status?: string;
    type?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.FlashDealWhereInput = { deletedAt: null };
    if (params.status) where.status = params.status as any;
    if (params.type) where.type = params.type as any;

    const [total, items] = await Promise.all([
      prisma.flashDeal.count({ where }),
      prisma.flashDeal.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
    ]);

    return { total, items };
  }

  /**
   * Admin — tek deal (silinmiş dahil, analytics için).
   */
  async adminFindById(dealId: string) {
    return prisma.flashDeal.findUnique({ where: { id: dealId } });
  }

  /**
   * Yeni fırsat oluşturur.
   */
  async create(data: Prisma.FlashDealCreateInput) {
    return prisma.flashDeal.create({ data });
  }

  /**
   * Günceller.
   */
  async update(dealId: string, data: Prisma.FlashDealUpdateInput) {
    return prisma.flashDeal.update({ where: { id: dealId }, data });
  }

  /**
   * Soft delete.
   */
  async softDelete(dealId: string) {
    return prisma.flashDeal.update({
      where: { id: dealId },
      data: { deletedAt: new Date(), status: "cancelled" },
    });
  }

  /**
   * Analytics: etkileşim sayılarını getirir.
   */
  async getInteractionCounts(dealId: string) {
    const rows = await prisma.flashDealInteraction.groupBy({
      by: ["type"],
      where: { dealId },
      _count: { id: true },
    });

    const counts: Record<string, number> = {
      impression: 0,
      click: 0,
      claim: 0,
      share: 0,
    };
    for (const row of rows) {
      counts[row.type] = row._count.id;
    }
    return counts;
  }

  /**
   * Analytics: unique impressions (distinct userId).
   */
  async getUniqueImpressions(dealId: string): Promise<number> {
    const result = await prisma.flashDealInteraction.findMany({
      where: { dealId, type: "impression" },
      distinct: ["userId"],
      select: { userId: true },
    });
    return result.length;
  }

  // ─── Cron ───

  async activateScheduledDeals(now: Date) {
    return prisma.flashDeal.updateMany({
      where: { status: "scheduled", startsAt: { lte: now }, deletedAt: null },
      data: { status: "active" },
    });
  }

  async expireActiveDeals(now: Date) {
    return prisma.flashDeal.updateMany({
      where: { status: "active", endsAt: { lte: now }, deletedAt: null },
      data: { status: "expired" },
    });
  }

  async markSoldOutDeals() {
    return prisma.flashDeal.updateMany({
      where: { status: "active", remainingStock: { lte: 0 }, deletedAt: null },
      data: { status: "soldOut" },
    });
  }
}

export const flashDealsRepository = new FlashDealsRepository();
