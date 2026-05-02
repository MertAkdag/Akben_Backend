import type { BatchViewsBody } from "./story-views.schema";
import { storyViewsRepository } from "./story-views.repository";

export class StoryViewsService {
  async batch(userId: string, body: BatchViewsBody): Promise<{ processed: number; skipped: number }> {
    return storyViewsRepository.batchCreateViews(userId, body.views);
  }
}

export const storyViewsService = new StoryViewsService();
