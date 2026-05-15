import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/response";
import { flashDealsService } from "./flash-deals.service";

// ─── Kullanıcı Tarafı ───

export const listActiveDeals = asyncHandler(async (req, res) => {
  const { limit, type } = req.query as unknown as {
    limit?: number;
    type?: string;
  };
  const result = await flashDealsService.listActive(req.userId, limit ?? 5, type);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const listUpcomingDeals = asyncHandler(async (req, res) => {
  const { limit } = req.query as unknown as { limit?: number };
  const result = await flashDealsService.listUpcoming(limit ?? 5);
  ok(res, result.data);
});

export const getDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.params as { dealId: string };
  const data = await flashDealsService.getById(dealId, req.userId);
  ok(res, data);
});

export const interactWithDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.params as { dealId: string };
  const { type, platform } = req.body as { type: string; platform: string };
  const data = await flashDealsService.interact(req.userId, dealId, type, platform);
  ok(res, data);
});

// ─── Admin Tarafı ───

export const adminListDeals = asyncHandler(async (req, res) => {
  const { status, type, page, limit } = req.query as unknown as {
    status?: string;
    type?: string;
    page: number;
    limit: number;
  };
  const result = await flashDealsService.adminList({
    status,
    type,
    page: page ?? 1,
    limit: limit ?? 20,
  });
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const adminGetDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.params as { dealId: string };
  const data = await flashDealsService.adminGetById(dealId);
  ok(res, data);
});

export const adminCreateDeal = asyncHandler(async (req, res) => {
  const data = await flashDealsService.adminCreate(req.body);
  res.status(201).json({ success: true, data });
});

export const adminUpdateDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.params as { dealId: string };
  const data = await flashDealsService.adminUpdate(dealId, req.body);
  ok(res, data);
});

export const adminUpdateDealStatus = asyncHandler(async (req, res) => {
  const { dealId } = req.params as { dealId: string };
  const { status } = req.body as { status: string };
  const data = await flashDealsService.adminUpdateStatus(dealId, status);
  ok(res, data);
});

export const adminDeleteDeal = asyncHandler(async (req, res) => {
  const { dealId } = req.params as { dealId: string };
  await flashDealsService.adminDelete(dealId);
  ok(res, { deleted: true });
});

export const adminDealAnalytics = asyncHandler(async (req, res) => {
  const { dealId } = req.params as { dealId: string };
  const data = await flashDealsService.adminAnalytics(dealId);
  ok(res, data);
});
