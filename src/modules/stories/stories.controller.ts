import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/response";
import type { PatchSeenBody } from "./stories.schema";
import type {
  CreateStoryUploadParams,
  CreateStoryUploadQuery,
} from "./stories.admin.schema";
import { storiesService } from "./stories.service";
import { resolveStoryMediaPublicBaseUrl } from "../../config/storyMedia";
import { storyToDto } from "../_shared/storyDto";

export const patchStorySeen = asyncHandler(async (req, res) => {
  const { storyId } = req.params as { storyId: string };
  const body = req.body as PatchSeenBody;
  const data = await storiesService.markSeen(req.userId, storyId, body);
  ok(res, data);
});

export const createStoryUpload = asyncHandler(async (req, res) => {
  const { groupId } = req.params as unknown as CreateStoryUploadParams;
  const query = req.query as unknown as CreateStoryUploadQuery;
  const story = await storiesService.createStoryFromUpload({
    groupId,
    query,
    binary: req.body as Buffer,
    contentType: req.header("content-type") ?? undefined,
    originalFilename: req.header("x-file-name") ?? undefined,
    publicBaseUrl: resolveStoryMediaPublicBaseUrl(req),
  });
  ok(res, storyToDto(story));
});
