import { encodeStoryGroupCursor } from "../../utils/cursor";
import { ApiError } from "../../utils/apiError";
import { groupToDto } from "../_shared/storyDto";
import { prisma } from "../../config/prisma";
import { storyGroupsRepository } from "./story-groups.repository";
import type { StoryGroupDto } from "../_shared/storyDto";

export class StoryGroupsService {
  async list(userId: string, limit: number, cursor: string | undefined): Promise<{
    data: StoryGroupDto[];
    meta: { total: number; limit: number; nextCursor: string | null };
  }> {
    const now = new Date();
    const [total, page] = await Promise.all([
      storyGroupsRepository.countActiveGroups(now),
      storyGroupsRepository.findGroupsPage({ now, limit, cursor }),
    ]);

    const hasMore = page.length > limit;
    const slice = hasMore ? page.slice(0, limit) : page;

    const storyIds = slice.flatMap((g) => g.stories.map((s) => s.id));
    const views =
      storyIds.length === 0
        ? []
        : await prisma.storyView.findMany({
            where: { userId, storyId: { in: storyIds } },
          });
    const viewsByStoryId = new Map(views.map((v) => [v.storyId, v]));

    const data = slice.map((g) => groupToDto(g, g.stories, viewsByStoryId));

    let nextCursor: string | null = null;
    if (hasMore && slice.length > 0) {
      const last = slice[slice.length - 1]!;
      nextCursor = encodeStoryGroupCursor(last.priority, last.id);
    }

    return {
      data,
      meta: { total, limit, nextCursor },
    };
  }

  async getById(groupId: string, userId: string): Promise<StoryGroupDto> {
    const now = new Date();
    const group = await storyGroupsRepository.findGroupWithActiveStories(groupId, now);
    if (!group) {
      throw new ApiError(404, "story_group_not_found", "Story group was not found.");
    }

    const storyIds = group.stories.map((s) => s.id);
    const views =
      storyIds.length === 0
        ? []
        : await prisma.storyView.findMany({
            where: { userId, storyId: { in: storyIds } },
          });
    const viewsByStoryId = new Map(views.map((v) => [v.storyId, v]));

    return groupToDto(group, group.stories, viewsByStoryId);
  }
}

export const storyGroupsService = new StoryGroupsService();
