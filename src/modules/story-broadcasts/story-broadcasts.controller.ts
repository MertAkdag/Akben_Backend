import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/response";
import { resolveStoryMediaPublicBaseUrl } from "../../config/storyMedia";
import { storyBroadcastsService } from "./story-broadcasts.service";
import type {
  BroadcastIdParams,
  CreateBroadcastQuery,
  ListBroadcastsQuery,
} from "./story-broadcasts.schema";

export const createStoryBroadcast = asyncHandler(async (req, res) => {
  const query = req.query as unknown as CreateBroadcastQuery;
  const dto = await storyBroadcastsService.createFromUpload({
    query,
    binary: req.body as Buffer,
    contentType: req.header("content-type") ?? undefined,
    originalFilename: req.header("x-file-name") ?? undefined,
    publicBaseUrl: resolveStoryMediaPublicBaseUrl(req),
    createdBy: req.userId ?? null,
  });
  ok(res, dto);
});

export const listStoryBroadcasts = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListBroadcastsQuery;
  const result = await storyBroadcastsService.list(query);
  res.status(200).json({ success: true, meta: result.meta, data: result.data });
});

export const getStoryBroadcast = asyncHandler(async (req, res) => {
  const { id } = req.params as unknown as BroadcastIdParams;
  ok(res, await storyBroadcastsService.getById(id));
});

export const retryStoryBroadcast = asyncHandler(async (req, res) => {
  const { id } = req.params as unknown as BroadcastIdParams;
  ok(res, await storyBroadcastsService.retry(id));
});
