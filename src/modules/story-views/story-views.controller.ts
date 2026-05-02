import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/response";
import type { BatchViewsBody } from "./story-views.schema";
import { storyViewsService } from "./story-views.service";

export const postBatchViews = asyncHandler(async (req, res) => {
  const body = req.body as BatchViewsBody;
  const data = await storyViewsService.batch(req.userId, body);
  ok(res, data);
});
