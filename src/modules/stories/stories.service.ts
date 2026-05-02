import { ApiError } from "../../utils/apiError";
import type { PatchSeenBody } from "./stories.schema";
import { storiesRepository } from "./stories.repository";

export class StoriesService {
  async markSeen(userId: string, storyId: string, body: PatchSeenBody) {
    const now = new Date();
    const story = await storiesRepository.findActiveById(storyId, now);
    if (!story) {
      throw new ApiError(
        404,
        "story_not_found",
        "Requested story does not exist or has expired.",
      );
    }

    const seenAt = new Date(body.seenAt);
    const ctaClickedAt = body.ctaClickedAt ? new Date(body.ctaClickedAt) : null;

    await storiesRepository.upsertView({
      userId,
      storyId,
      seenAt,
      completed: body.completed,
      ctaClicked: body.ctaClicked,
      ctaClickedAt,
      platform: body.platform,
    });

    return {
      storyId,
      isSeen: true,
      seenAt: seenAt.toISOString(),
      completed: body.completed,
      ctaClicked: body.ctaClicked,
      ctaClickedAt: ctaClickedAt?.toISOString() ?? null,
    };
  }
}

export const storiesService = new StoriesService();
