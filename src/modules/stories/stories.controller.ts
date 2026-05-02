import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/response";
import type { PatchSeenBody } from "./stories.schema";
import { storiesService } from "./stories.service";

export const patchStorySeen = asyncHandler(async (req, res) => {
  const { storyId } = req.params as { storyId: string };
  const body = req.body as PatchSeenBody;
  const data = await storiesService.markSeen(req.userId, storyId, body);
  ok(res, data);
});
