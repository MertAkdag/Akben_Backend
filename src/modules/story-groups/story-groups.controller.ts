import { asyncHandler } from "../../utils/asyncHandler";
import { ok } from "../../utils/response";
import { storyGroupsService } from "./story-groups.service";

export const listStoryGroups = asyncHandler(async (req, res) => {
  // Zod validateQuery middleware'i req.query'yi zaten parse etti,
  // limit coerce ile number'a dönüştü. undefined ise varsayılan 10.
  const { limit, cursor } = req.query as unknown as {
    limit?: number;
    cursor?: string;
  };
  const result = await storyGroupsService.list(
    req.userId,
    limit ?? 10,
    cursor,
  );
  ok(res, result.data, result.meta);
});

export const getStoryGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params as { groupId: string };
  const data = await storyGroupsService.getById(groupId, req.userId);
  ok(res, data);
});
